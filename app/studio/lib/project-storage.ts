import { StudioProject, RoomSettings, FurnitureInstance } from '../types/furniture';

const STORAGE_KEY = 'icanvas_studio_saved_projects_v1';
const AUTO_SAVE_KEY = 'icanvas_studio_autosave_v1';

export function getSavedProjects(): StudioProject[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.error('Failed to load saved projects:', err);
    return [];
  }
}

export function saveProject(project: StudioProject): StudioProject {
  const current = getSavedProjects();
  const now = new Date().toISOString();
  const updatedProject: StudioProject = {
    ...project,
    updatedAt: now,
    createdAt: project.createdAt || now,
  };

  const existingIndex = current.findIndex((p) => p.id === project.id);
  let nextList: StudioProject[];
  if (existingIndex >= 0) {
    nextList = [...current];
    nextList[existingIndex] = updatedProject;
  } else {
    nextList = [updatedProject, ...current];
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));
  } catch (e) {
    console.warn('LocalStorage full or quota exceeded, attempting to save without thumbnail:', e);
    // If quota exceeded due to base64 thumbnails, strip thumbnails of older projects
    const fallbackList = nextList.map((p, idx) => (idx === 0 ? p : { ...p, thumbnailUrl: undefined }));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackList));
    } catch {
      console.error('Unable to save to localStorage.');
    }
  }

  return updatedProject;
}

export function deleteProject(id: string): void {
  const current = getSavedProjects();
  const nextList = current.filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));
}

export function getAutoSavedProject(): StudioProject | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTO_SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveAutoSaveState(project: StudioProject): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(project));
  } catch {
    // silently ignore quota errors for autosave
  }
}

export function exportProjectAsJson(project: StudioProject): void {
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(project, null, 2)
  )}`;
  const downloadAnchor = document.createElement('a');
  const safeName = (project.name || 'projeto_studio').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  downloadAnchor.setAttribute('href', jsonString);
  downloadAnchor.setAttribute('download', `${safeName}_${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export async function importProjectFromJson(file: File): Promise<StudioProject> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);

        if (!data || !data.room || !Array.isArray(data.furniture)) {
          throw new Error('Arquivo de projeto inválido: estrutura incompleta.');
        }

        const project: StudioProject = {
          id: data.id || `proj_${Date.now()}`,
          name: data.name || file.name.replace(/\.json$/i, ''),
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          thumbnailUrl: data.thumbnailUrl,
          room: data.room,
          furniture: data.furniture,
          cameraSettings: data.cameraSettings,
        };

        resolve(project);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo selecionado.'));
    reader.readAsText(file);
  });
}
