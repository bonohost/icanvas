// Este arquivo é necessário para que o TypeScript entenda as tags customizadas do A-Frame
// como elementos JSX válidos.

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'a-scene': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { [key: string]: any }, HTMLElement>;
      'a-sky': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { [key: string]: any }, HTMLElement>;
      'a-box': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { [key: string]: any }, HTMLElement>;
      'a-camera': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { [key: string]: any }, HTMLElement>;
    }
  }
}