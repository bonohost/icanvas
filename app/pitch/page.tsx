'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  TrendingUp,
  Cpu,
  Layers,
  DollarSign,
  PieChart,
  ShieldCheck,
  Target,
  Rocket,
  Globe,
  Lock,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  Copy,
  Check,
  Zap,
  Boxes,
  Eye,
  Sliders,
  Calendar,
  Share2,
  FileSpreadsheet,
  ArrowUpRight,
  ShieldAlert,
  Building2,
  FileCheck
} from 'lucide-react';

export default function PitchDeckPage() {
  const [viewMode, setViewMode] = useState<'slides' | 'document'>('slides');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [copied, setCopied] = useState(false);
  const [investmentAmount, setInvestmentAmount] = useState(50000); // R$ 50k default ticket
  const [ndaAgreed, setNdaAgreed] = useState(false);

  const totalRound = 300000;
  const phoneNumber = "5516991041695";

  // WhatsApp link generator
  const getWhatsAppUrl = (customMsg?: string) => {
    const text = customMsg || `Olá! Analisei a apresentação confidencial da iCanvas para a captação de R$ 300.000,00 e gostaria de agendar uma reunião sobre a rodada.`;
    return `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(text)}`;
  };

  const copyDeckLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Keyboard navigation for slides
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== 'slides') return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentSlide((prev) => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode]);

  // Slides Data
  const slides = [
    {
      id: 'cover',
      tag: '01 / 08 • APRESENTAÇÃO EXECUTIVA',
      title: 'iCanvas 3D AI Engine',
      subtitle: 'A próxima geração da criação e visualização 3D em tempo real para e-commerce e produtos',
      badge: 'Rodada Pre-Seed • R$ 300.000',
      content: (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900/30 via-purple-900/20 to-slate-900/40 border border-blue-500/20 backdrop-blur-xl">
            <p className="text-xl md:text-2xl font-light text-slate-200 leading-relaxed">
              Transformando fotos e especificações técnicas em <strong className="text-blue-400 font-semibold">modelos 3D interativos e ultraleves</strong> diretamente no navegador em segundos, reduzindo custos de modelagem em até <span className="text-emerald-400 font-semibold">85%</span>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-blue-400 mb-2">
                <span className="text-xs uppercase font-mono tracking-wider">Captação Aberta</span>
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-white">R$ 300.000</div>
              <p className="text-xs text-slate-400 mt-1">Mútuo Conversível / SAFE Pre-Seed</p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-purple-400 mb-2">
                <span className="text-xs uppercase font-mono tracking-wider">Destinação Principal</span>
                <Cpu className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-white">45% P&D e IA 3D</div>
              <p className="text-xs text-slate-400 mt-1">Pipeline de malhas e geração automatizada</p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-emerald-400 mb-2">
                <span className="text-xs uppercase font-mono tracking-wider">Mercado Global</span>
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-white">CAGR +33.8%</div>
              <p className="text-xs text-slate-400 mt-1">Mercado de 3D & AI projetado em $32.5B</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
              <Lock className="w-3.5 h-3.5 text-amber-400" /> Confidencial
            </span>
            <span className="bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
              Uso exclusivo para Investidores & Anjos
            </span>
            <span className="bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
              Ticker: iCanvas Pre-Seed 2026
            </span>
          </div>
        </div>
      )
    },
    {
      id: 'problem',
      tag: '02 / 08 • O PROBLEMA & DOR DE MERCADO',
      title: 'A Barreira do 3D Tradicional',
      subtitle: 'Por que o mercado precisa urgentemente de uma solução automatizada e nativa da web?',
      badge: 'Gargalos Críticos',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-6 rounded-2xl bg-gradient-to-b from-rose-950/30 to-slate-900/60 border border-rose-500/20 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 font-bold text-lg">
                01
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Custo Proibitivo & Lento</h4>
              <p className="text-sm text-slate-300 leading-relaxed">
                Modelagem manual em Blender/Maya custa entre <strong>R$ 500 e R$ 3.000 por item</strong> e leva dias. Inviável para catálogos com centenas de produtos ou pequenas e médias marcas.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-rose-500/10 text-xs text-rose-300 font-mono">
              Impacto: 92% das marcas desistem do 3D.
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-b from-amber-950/30 to-slate-900/60 border border-amber-500/20 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 font-bold text-lg">
                02
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Sem Integração WebGL</h4>
              <p className="text-sm text-slate-300 leading-relaxed">
                Modelos 3D brutos são pesados (dezenas de MBs), travam celulares e não possuem pipelines integrados com lojas virtuais (Shopify, Nuvemshop, WooCommerce).
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-amber-500/10 text-xs text-amber-300 font-mono">
              Impacto: Altas taxas de rejeição na web.
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-b from-indigo-950/30 to-slate-900/60 border border-indigo-500/20 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 font-bold text-lg">
                03
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Players Globais Distantes</h4>
              <p className="text-sm text-slate-300 leading-relaxed">
                Ferramentas estrangeiras cobram caro em Dólar (USD), não têm suporte no Brasil, não customizam fluxos de checkout e focam apenas no asset bruto, sem a experiência interativa final.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-indigo-500/10 text-xs text-indigo-300 font-mono">
              Oportunidade: Vácuo no mercado LatAm.
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'solution',
      tag: '03 / 08 • NOSSA SOLUÇÃO & TECNOLOGIA',
      title: 'Plataforma iCanvas: Geração + Interatividade WebGL',
      subtitle: 'O pipeline completo que vai da imagem/prompt à experiência 3D fotorrealista e leve',
      badge: 'Diferencial Tecnológico',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-white mb-1">1. IA Generativa 3D</div>
              <p className="text-xs text-slate-400">Entrada por foto, vetor ou descrição textual gerando geometria precisa em segundos.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3">
                <Cpu className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-white mb-1">2. Retopologia & LOD</div>
              <p className="text-xs text-slate-400">Otimização automática de polígonos e UV mapping para carregar em menos de 1 segundo.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3">
                <Layers className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-white mb-1">3. Customizador WebGL</div>
              <p className="text-xs text-slate-400">Troca de texturas, materiais PBR metálicos/cerâmicos, estampas e reflexos em tempo real.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
                <Rocket className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-white mb-1">4. Embed & Checkout</div>
              <p className="text-xs text-slate-400">1 linha de código para embutir em qualquer e-commerce, gerando conversão imediata.</p>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-blue-950/20 border border-blue-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
                <Eye className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Demos Reais e Funcionais Já Desenvolvidas</h4>
                <p className="text-xs text-slate-300">Explore as aplicações interativas de alta fidelidade já construídas na plataforma iCanvas.</p>
              </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Link
                href="/mug-coffee"
                target="_blank"
                className="flex-1 md:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all"
              >
                Simulador Caneca 3D <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/360-viewer"
                target="_blank"
                className="flex-1 md:flex-none px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all"
              >
                Viewer 360° <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'benchmarks',
      tag: '04 / 08 • REFERÊNCIAS & BENCHMARK DE MERCADO',
      title: 'Validações Globais & Posicionamento Estratégico',
      subtitle: 'O mercado mundial comprovou a demanda multimilionária por 3D generativo e interativo',
      badge: 'Referências Globais',
      content: (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 border border-slate-800 rounded-xl overflow-hidden">
              <thead className="bg-slate-900/90 text-slate-400 uppercase font-mono border-b border-slate-800">
                <tr>
                  <th className="p-3">Player / Referência</th>
                  <th className="p-3">Foco Principal</th>
                  <th className="p-3">Tração / Valuation</th>
                  <th className="p-3">Lacuna / Onde Entramos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/60">
                <tr className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-3 font-semibold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400"></span> Meshy.ai / Tripo 3D
                  </td>
                  <td className="p-3">Geração Text-to-3D / Image-to-3D bruta</td>
                  <td className="p-3 text-emerald-400 font-mono">$10M+ captados, milhões de usuários</td>
                  <td className="p-3 text-slate-400">Não oferecem customizador de produto para e-commerce nem suporte regional.</td>
                </tr>
                <tr className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-3 font-semibold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span> Spline.design
                  </td>
                  <td className="p-3">Design 3D colaborativo na web</td>
                  <td className="p-3 text-emerald-400 font-mono">Series A $15M (OpenAI/Index)</td>
                  <td className="p-3 text-slate-400">Exige conhecimento manual de modelagem, não é focado no lojista final.</td>
                </tr>
                <tr className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-3 font-semibold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span> Threekit / Sketchfab
                  </td>
                  <td className="p-3">Configuradores 3D Enterprise e Asset Store</td>
                  <td className="p-3 text-emerald-400 font-mono">Sketchfab adquirido pela Epic Games</td>
                  <td className="p-3 text-slate-400">Custos proibitivos (Enterprise $$$$), setup manual demorado.</td>
                </tr>
                <tr className="bg-blue-950/30 hover:bg-blue-950/40 transition-colors border-l-4 border-blue-500">
                  <td className="p-3 font-bold text-blue-300 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" /> iCanvas (Nossa Tese)
                  </td>
                  <td className="p-3 font-medium text-white">Geração IA + Retopologia + Customizador WebGL + Embed E-commerce</td>
                  <td className="p-3 text-blue-400 font-mono font-bold">Rodada Pre-Seed: R$ 300k</td>
                  <td className="p-3 text-emerald-300 font-semibold">Ponta-a-ponta, precificação em R$, plug-and-play para e-commerces.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs uppercase font-mono text-purple-400 mb-1">Impacto Comprovado no E-commerce</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Estudos da Shopify e Google apontam que páginas com <strong>modelos 3D e Realidade Aumentada aumentam as taxas de conversão em até 94%</strong> e reduzem devoluções em <strong>40%</strong>.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs uppercase font-mono text-cyan-400 mb-1">Vantagem de Entrada (First Mover Brasil)</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Capturar o mercado de personalização de brindes, vestuário, embalagens e móveis com integração direta nas maiores plataformas de e-commerce do país.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'business-model',
      tag: '05 / 08 • MODELO DE NEGÓCIO & UNIT ECONOMICS',
      title: 'Monetização Escalável B2B & API',
      subtitle: 'Receita recorrente previsível aliada a consumo sob demanda de geração 3D',
      badge: 'SaaS B2B + Usage-Based',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono uppercase text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full">1. Assinatura SaaS</span>
              <h4 className="text-lg font-bold text-white mt-3 mb-2">Planos Mensais / Anuais</h4>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Assinaturas para marcas e lojas virtuais incorporarem o visualizador e customizador em seus catálogos.
              </p>
              <div className="space-y-2 text-xs text-slate-400">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span>Starter (10 produtos)</span>
                  <span className="text-white font-mono font-bold">R$ 290/mês</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span>Pro (50 produtos)</span>
                  <span className="text-white font-mono font-bold">R$ 690/mês</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Enterprise (Ilimitado)</span>
                  <span className="text-white font-mono font-bold">R$ 1.990+/mês</span>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-800 text-xs text-blue-300">
              Receita recorrente e alta retenção (LTV/CAC &gt; 4x).
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono uppercase text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full">2. API de Geração 3D</span>
              <h4 className="text-lg font-bold text-white mt-3 mb-2">Pay-as-you-go / Tokens</h4>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Desenvolvedores, estúdios de jogos e agências utilizam nossa API para converter fotos e prompts em modelos 3D via API.
              </p>
              <div className="space-y-2 text-xs text-slate-400">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span>Custo por Geração AI</span>
                  <span className="text-emerald-400 font-mono font-bold">~R$ 0,80</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span>Preço cobrado / Modelo</span>
                  <span className="text-white font-mono font-bold">R$ 5,00 a R$ 15,00</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Margem Bruta</span>
                  <span className="text-emerald-400 font-mono font-bold">75% - 85%</span>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-800 text-xs text-purple-300">
              Modelo escalável com altíssima margem de contribuição.
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono uppercase text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">3. Custom Enterprise</span>
              <h4 className="text-lg font-bold text-white mt-3 mb-2">Setups Sob Medida</h4>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Grandes indústrias e varejistas que exigem configuradores complexos, integração ERP e renderizadores dedicados.
              </p>
              <div className="space-y-2 text-xs text-slate-400">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span>Ticket Médio Setup</span>
                  <span className="text-white font-mono font-bold">R$ 8.000 - R$ 25.000</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span>Suporte & SLA Dedicado</span>
                  <span className="text-white font-mono font-bold">R$ 2.500/mês</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Cash Flow Imediato</span>
                  <span className="text-emerald-400 font-mono font-bold">Inflow Inicial</span>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-800 text-xs text-emerald-300">
              Gera fluxo de caixa rápido enquanto o SaaS escala.
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'allocation',
      tag: '06 / 08 • DESTINAÇÃO DOS R$ 300.000',
      title: 'Plano Financeiro & Alocação de Capital',
      subtitle: 'Eficiência máxima de capital com runway projetado de 14 a 18 meses',
      badge: 'Captação Pre-Seed: R$ 300k',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span> 45% • P&D & IA Generativa 3D
                  </span>
                  <span className="font-mono font-bold text-blue-400">R$ 135.000</span>
                </div>
                <p className="text-xs text-slate-400">
                  Treinamento e fine-tuning de modelos generativos, aluguel de clusters GPU (H100/A100 spot), pipeline automatizado de retopologia de malha e geração de mapas UV/PBR.
                </p>
                <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: '45%' }}></div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-purple-500"></span> 25% • Engenharia & SDK WebGL
                  </span>
                  <span className="font-mono font-bold text-purple-400">R$ 75.000</span>
                </div>
                <p className="text-xs text-slate-400">
                  Desenvolvimento do widget embedável para Shopify/Nuvemshop, infraestrutura cloud escalável, painel do lojista e otimizador de shaders web.
                </p>
                <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: '25%' }}></div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span> 18% • Go-To-Market & Aquisição B2B
                  </span>
                  <span className="font-mono font-bold text-emerald-400">R$ 54.000</span>
                </div>
                <p className="text-xs text-slate-400">
                  Aquisição dos primeiros 50 clientes pagantes, campanhas B2B direcionadas para indústrias de brindes, móveis e personalização, produção de cases de sucesso.
                </p>
                <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '18%' }}></div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500"></span> 12% • Jurídico, SAFE & Runway
                  </span>
                  <span className="font-mono font-bold text-amber-400">R$ 36.000</span>
                </div>
                <p className="text-xs text-slate-400">
                  Estruturação jurídica do investimento (Mútuo Conversível / SAFE), registro de propriedade intelectual da engine e fundo de segurança operacional.
                </p>
                <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: '12%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-blue-950/40 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <div>
                <span className="text-sm font-bold text-white">Runway Garantido: 14 a 18 Meses</span>
                <p className="text-xs text-slate-400">Burn rate disciplinado focado estritamente em validação técnica e tração de receita.</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 uppercase font-mono">Meta de MRR em 12m</span>
              <div className="text-lg font-bold text-emerald-400 font-mono">R$ 45.000+ /mês</div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'roadmap',
      tag: '07 / 08 • ROADMAP & METAS (12 MESES)',
      title: 'Marcos de Entrega com o Capital',
      subtitle: 'Execução pragmática dividida em 4 fases claras de validação e escala',
      badge: 'Execução & Milestones',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 relative">
            <div className="text-xs font-mono font-bold text-blue-400 mb-2">MÊS 1 - 3 • FASE 1</div>
            <h4 className="text-base font-bold text-white mb-2">Engine V1 Alpha</h4>
            <ul className="text-xs text-slate-300 space-y-2">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <span>Pipeline de Image-to-3D estável</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <span>Export automático em glTF e USDZ</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <span>5 clientes pilotos beta</span>
              </li>
            </ul>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 relative">
            <div className="text-xs font-mono font-bold text-purple-400 mb-2">MÊS 4 - 6 • FASE 2</div>
            <h4 className="text-base font-bold text-white mb-2">Plugins de E-commerce</h4>
            <ul className="text-xs text-slate-300 space-y-2">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                <span>Widget Shopify & Nuvemshop</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                <span>Simulador de customização em lote</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                <span>R$ 15.000 MRR atingidos</span>
              </li>
            </ul>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 relative">
            <div className="text-xs font-mono font-bold text-cyan-400 mb-2">MÊS 7 - 9 • FASE 3</div>
            <h4 className="text-base font-bold text-white mb-2">API Pública B2B</h4>
            <ul className="text-xs text-slate-300 space-y-2">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>Lançamento da API para devs</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>Geração em menos de 10s</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>R$ 30.000 MRR</span>
              </li>
            </ul>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 relative">
            <div className="text-xs font-mono font-bold text-emerald-400 mb-2">MÊS 10 - 12 • FASE 4</div>
            <h4 className="text-base font-bold text-white mb-2">Escala & Rodada Seed</h4>
            <ul className="text-xs text-slate-300 space-y-2">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Mais de 100 lojas ativas</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>R$ 50.000+ MRR recorrente</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Abertura de Rodada Seed institucional</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'closing',
      tag: '08 / 08 • FECHAMENTO & SIMULAÇÃO DO INVESTIDOR',
      title: 'Participe da Rodada Pre-Seed iCanvas',
      subtitle: 'Simule sua participação e agende uma conversa direta com os fundadores',
      badge: 'Oportunidade Aberta',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Interactive Ticket Calculator */}
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-blue-500/30">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-400" /> Simulador de Ticket
                </h4>
                <span className="text-xs font-mono text-slate-400">Total da Rodada: R$ 300k</span>
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-slate-400">Seu Ticket de Entrada:</span>
                  <span className="text-xl font-bold font-mono text-blue-400">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(investmentAmount)}
                  </span>
                </div>
                <input
                  type="range"
                  min="25000"
                  max="300000"
                  step="25000"
                  value={investmentAmount}
                  onChange={(e) => setInvestmentAmount(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                  <span>R$ 25k (Mínimo Anjo)</span>
                  <span>R$ 150k</span>
                  <span>R$ 300k (Lead Investor)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800 text-xs">
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-slate-400">Fração da Rodada</div>
                  <div className="text-lg font-bold font-mono text-white mt-1">
                    {((investmentAmount / totalRound) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-slate-400">Instrumento Jurídico</div>
                  <div className="text-sm font-bold text-emerald-400 mt-1">
                    Mútuo Conversível / SAFE
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Contact Action */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-900/40 via-purple-950/30 to-slate-900/90 border border-blue-500/30 flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Rodada em Andamento
                </div>
                <h4 className="text-xl font-bold text-white mb-2">Agende uma Apresentação de 20 min</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Converse diretamente com o time fundador, veja o pipeline de IA rodando ao vivo e tire todas as dúvidas sobre valuation, cap table e termos.
                </p>
              </div>

              <div className="space-y-3 pt-4">
                <a
                  href={getWhatsAppUrl(`Olá! Vi o Pitch Deck da iCanvas e tenho interesse em analisar a rodada de R$ 300k com ticket simulado de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(investmentAmount)}.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/40 text-sm"
                >
                  <MessageCircle className="w-5 h-5" /> Falar via WhatsApp com o Fundador
                </a>

                <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
                  <span>Telefone: +55 (16) 99104-1695</span>
                  <span>•</span>
                  <span>São Paulo / Brasil</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Secret / Confidential Bar */}
      <div className="bg-slate-950/90 border-b border-white/5 py-2 px-4 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-amber-400 font-mono bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 font-medium">
              <Lock className="w-3 h-3" /> PÁGINA OCULTA • LINK CONFIDENCIAL
            </span>
            <span className="hidden sm:inline text-slate-400">
              Material restrito para investidores • Rodada Pre-Seed (R$ 300.000,00)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="bg-slate-900 p-0.5 rounded-lg border border-slate-800 flex items-center">
              <button
                onClick={() => setViewMode('slides')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'slides'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Modo Slides (Deck)
              </button>
              <button
                onClick={() => setViewMode('document')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'document'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Documento Completo
              </button>
            </div>

            {/* Copy Share Link Button */}
            <button
              onClick={copyDeckLink}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-all flex items-center gap-1.5"
              title="Copiar link confidencial"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Link</span>
                </>
              )}
            </button>

            {/* WhatsApp Quick CTA */}
            <a
              href={getWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1 px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-lg border border-emerald-500/30 transition-all"
            >
              <MessageCircle className="w-3.5 h-3.5" /> Contato Direto
            </a>
          </div>
        </div>
      </div>

      {/* Main Pitch Content Area */}
      {viewMode === 'slides' ? (
        /* SLIDES PRESENTATION MODE */
        <div className="flex-1 flex flex-col justify-between max-w-6xl w-full mx-auto px-4 py-6 md:py-10">
          {/* Slide Header & Controls */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white">
                  iC
                </div>
                <span className="font-bold text-lg text-white tracking-tight">iCanvas 3D</span>
              </Link>
              <span className="text-slate-600">|</span>
              <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                {slides[currentSlide].tag}
              </span>
            </div>

            {/* Slide Navigation Buttons */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono mr-2 hidden sm:inline">
                {currentSlide + 1} de {slides.length}
              </span>
              <button
                onClick={() => setCurrentSlide((prev) => Math.max(prev - 1, 0))}
                disabled={currentSlide === 0}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 transition-all"
                title="Slide Anterior (Seta Esquerda)"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1))}
                disabled={currentSlide === slides.length - 1}
                className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Próximo Slide (Seta Direita / Espaço)"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Active Slide Card */}
          <div className="flex-1 bg-slate-950/70 border border-slate-800/80 rounded-3xl p-6 md:p-10 backdrop-blur-2xl shadow-2xl relative overflow-hidden flex flex-col justify-between">
            {/* Ambient Lighting / Glow */}
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 space-y-6">
              {/* Slide Title & Subtitle */}
              <div>
                <div className="inline-block text-xs font-mono uppercase tracking-wider text-purple-400 mb-2 font-semibold">
                  {slides[currentSlide].badge}
                </div>
                <h2 className="text-2xl md:text-4xl font-bold text-white tracking-tight mb-2">
                  {slides[currentSlide].title}
                </h2>
                <p className="text-sm md:text-base text-slate-400">
                  {slides[currentSlide].subtitle}
                </p>
              </div>

              {/* Dynamic Slide Content */}
              <div className="pt-2">
                {slides[currentSlide].content}
              </div>
            </div>

            {/* Slide Progression Dots */}
            <div className="relative z-10 pt-8 mt-6 border-t border-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {slides.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => setCurrentSlide(idx)}
                    className={`h-2 rounded-full transition-all ${
                      currentSlide === idx
                        ? 'w-8 bg-blue-500'
                        : 'w-2 bg-slate-800 hover:bg-slate-700'
                    }`}
                    title={`Ir para slide ${idx + 1}`}
                  />
                ))}
              </div>

              <div className="text-[11px] text-slate-500 font-mono hidden md:block">
                Use as teclas ← e → do teclado para navegar
              </div>
            </div>
          </div>

          {/* Quick Action Footer for Deck Mode */}
          <div className="flex flex-wrap items-center justify-between gap-4 mt-6 text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <span>iCanvas Technology © 2026</span>
              <span>•</span>
              <button
                onClick={() => setViewMode('document')}
                className="hover:text-blue-400 underline"
              >
                Ver em formato de documento contínuo (Memorando)
              </button>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={getWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline flex items-center gap-1 font-medium"
              >
                <MessageCircle className="w-3.5 h-3.5" /> Falar com Fundador
              </a>
            </div>
          </div>
        </div>
      ) : (
        /* DOCUMENT / MEMORANDUM LONG-READ MODE */
        <div className="max-w-5xl w-full mx-auto px-4 py-12 space-y-16">
          {/* Document Header */}
          <header className="text-center space-y-4 max-w-3xl mx-auto border-b border-slate-800 pb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-mono font-semibold border border-blue-500/20">
              <ShieldCheck className="w-4 h-4" /> MEMORANDO DE INVESTIMENTO • PRE-SEED
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
              iCanvas: Democratizando a Criação & Visualização 3D com Inteligência Artificial
            </h1>
            <p className="text-base md:text-lg text-slate-400 leading-relaxed">
              Documento de apresentação executiva e benchmark de mercado para captação de <strong>R$ 300.000,00</strong> em Mútuo Conversível / SAFE.
            </p>

            <div className="flex flex-wrap justify-center items-center gap-6 pt-4 text-xs font-mono text-slate-400">
              <div><strong className="text-white">Alvo da Rodada:</strong> R$ 300.000</div>
              <div><strong className="text-white">Ticket Mínimo:</strong> R$ 25.000</div>
              <div><strong className="text-white">Instrumento:</strong> Mútuo Conversível (SAFE)</div>
              <div><strong className="text-white">Runway Alvo:</strong> 14 a 18 meses</div>
            </div>
          </header>

          {/* Section 1: Executive Summary */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
                01
              </div>
              <h2 className="text-2xl font-bold text-white">1. Sumário Executivo & Tese de Investimento</h2>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 text-slate-300 text-sm leading-relaxed">
              <p>
                A <strong className="text-white">iCanvas</strong> é uma startup de tecnologia focada em resolver o principal gargalo da internet espacial e do e-commerce moderno: o custo e a complexidade de gerar e exibir modelos 3D interativos e ultraleves na web.
              </p>
              <p>
                Combinamos <strong>Inteligência Artificial Generativa (Image-to-3D e Text-to-3D)</strong>, algoritmos proprietários de <strong>retopologia e otimização de malha (LOD)</strong> e um <strong>visualizador WebGL de altíssimo desempenho</strong> que roda instantaneamente em qualquer smartphone ou desktop sem necessidade de downloads.
              </p>
              <p>
                Buscamos <strong>R$ 300.000,00</strong> para finalizar a engine de geração automática, lançar integrações plug-and-play para as principais plataformas de e-commerce e atingir o marco de <strong>R$ 50.000 em MRR</strong> em 12 meses.
              </p>
            </div>
          </section>

          {/* Section 2: Market Pain & Problem */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
                02
              </div>
              <h2 className="text-2xl font-bold text-white">2. O Problema: O Custo e a Ineficiência do 3D</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <h4 className="font-bold text-rose-400 text-sm">Modelagem Manual Extenuante</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Contratar modeladores 3D tradicionais custa entre R$ 500 e R$ 3.000 por asset e demora de 3 a 7 dias por produto.
                </p>
              </div>
              <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <h4 className="font-bold text-amber-400 text-sm">Arquivos Pesados & Incompatíveis</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Assets 3D não otimizados pesam dezenas de megabytes, travando a navegação mobile e arruinando o SEO dos lojistas.
                </p>
              </div>
              <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <h4 className="font-bold text-purple-400 text-sm">Ausência de Solução Integrada</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Lojas precisam contratar um modelador, depois um desenvolvedor WebGL e depois um integrador de checkout. A iCanvas une tudo em um único fluxo.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Technology & Demonstrators */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
                03
              </div>
              <h2 className="text-2xl font-bold text-white">3. Tecnologia & Demos Já Operacionais</h2>
            </div>
            <p className="text-sm text-slate-300">
              Diferente de projetos em fase puramente conceitual, a iCanvas já conta com módulos interativos e motores de renderização funcionando:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">Simulador de Produtos 3D (Caneca / Brindes)</h4>
                  <p className="text-xs text-slate-400 mt-1">Aplicação de estampas, materiais cerâmicos e reflexos em tempo real.</p>
                </div>
                <Link
                  href="/mug-coffee"
                  target="_blank"
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1"
                >
                  Testar Demo <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">Visualizador Panorâmico 360°</h4>
                  <p className="text-xs text-slate-400 mt-1">Navegação imersiva para ambientes, arquitetura e vitrines virtuais.</p>
                </div>
                <Link
                  href="/360-viewer"
                  target="_blank"
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1"
                >
                  Testar Demo <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </section>

          {/* Section 4: Market Benchmarks & Competitors */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
                04
              </div>
              <h2 className="text-2xl font-bold text-white">4. Referências de Mercado & Benchmark Comparativo</h2>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <p className="text-sm text-slate-300 leading-relaxed">
                O surgimento de ferramentas como <strong className="text-white">Meshy.ai</strong>, <strong className="text-white">Tripo 3D</strong> e <strong className="text-white">Spline</strong> comprova a explosão da demanda global por 3D impulsionado por IA. No entanto, essas plataformas globais deixam lacunas decisivas que a iCanvas preenche:
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300 border border-slate-800 rounded-xl">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-mono">
                    <tr>
                      <th className="p-3">Critério de Comparação</th>
                      <th className="p-3">Meshy / Tripo</th>
                      <th className="p-3">Spline / ThreeKit</th>
                      <th className="p-3 text-blue-400 font-bold">iCanvas (Brasil & LatAm)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    <tr>
                      <td className="p-3 font-semibold text-white">Geração Automática via IA</td>
                      <td className="p-3 text-emerald-400">Sim (Apenas Asset)</td>
                      <td className="p-3 text-rose-400">Manual / Não nativo</td>
                      <td className="p-3 text-emerald-400 font-bold">Sim (Asset + Produto)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-white">Customizador de Produto Web</td>
                      <td className="p-3 text-rose-400">Não</td>
                      <td className="p-3 text-amber-400">Parcial (Complexo)</td>
                      <td className="p-3 text-emerald-400 font-bold">Sim (Nativo WebGL)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-white">Integração E-commerce (Shopify/Nuvemshop)</td>
                      <td className="p-3 text-rose-400">Não</td>
                      <td className="p-3 text-amber-400">Via API Custom ($$$)</td>
                      <td className="p-3 text-emerald-400 font-bold">Sim (Plug-and-play)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-white">Cobrança e Moeda</td>
                      <td className="p-3 text-slate-400">USD (Dólar com IOF)</td>
                      <td className="p-3 text-slate-400">USD Enterprise ($$$$)</td>
                      <td className="p-3 text-emerald-400 font-bold">BRL (Reais com Nota Fiscal)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Section 5: Financial Plan & R$ 300k Allocation */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
                05
              </div>
              <h2 className="text-2xl font-bold text-white">5. Destinação do Investimento de R$ 300.000,00</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-xs font-mono text-blue-400 uppercase">R$ 135.000 (45%)</div>
                <h4 className="font-bold text-white text-base mt-1 mb-2">P&D, Modelos de IA e Infra GPU</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Custos computacionais com GPUs A100/H100 para treinamento e inferência, desenvolvimento da pipeline de retopologia e UV unwrap automático.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-xs font-mono text-purple-400 uppercase">R$ 75.000 (25%)</div>
                <h4 className="font-bold text-white text-base mt-1 mb-2">Engenharia WebGL & SDKs</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Criação dos widgets de incorporação rápida, conectores para plataformas de lojas e painel administrativo SaaS.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-xs font-mono text-emerald-400 uppercase">R$ 54.000 (18%)</div>
                <h4 className="font-bold text-white text-base mt-1 mb-2">Aquisição B2B & Go-To-Market</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Marketing de crescimento B2B, onboarding dos primeiros 50 clientes e validação dos canais de tração com lojas e indústrias.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-xs font-mono text-amber-400 uppercase">R$ 36.000 (12%)</div>
                <h4 className="font-bold text-white text-base mt-1 mb-2">Jurídico, Mútuo Conversível & Reserva</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Contratos SAFE com investidores, propriedade intelectual e colchão financeiro operacional de segurança.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6: Direct Action & Schedule Call */}
          <section className="p-8 md:p-12 rounded-3xl bg-gradient-to-r from-blue-950/60 via-purple-950/40 to-slate-900 border border-blue-500/30 text-center space-y-6">
            <h2 className="text-3xl font-bold text-white tracking-tight">
              Pronto para Conhecer os Detalhes da Rodada?
            </h2>
            <p className="text-sm md:text-base text-slate-300 max-w-2xl mx-auto">
              Agende uma reunião de 20 minutos diretamente com os fundadores para conferir o plano detalhado de captação de <strong>R$ 300.000,00</strong> e tirar dúvidas sobre termos e governança.
            </p>

            <div className="flex flex-wrap justify-center gap-4 pt-2">
              <a
                href={getWhatsAppUrl("Olá! Li o memorando de investimento da iCanvas e gostaria de agendar uma reunião sobre a rodada de R$ 300.000,00.")}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-950 text-sm transition-all"
              >
                <MessageCircle className="w-5 h-5" /> Agendar Conversa via WhatsApp
              </a>

              <button
                onClick={() => setViewMode('slides')}
                className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl flex items-center gap-2 border border-slate-700 text-sm transition-all"
              >
                <Maximize2 className="w-4 h-4" /> Ver em Modo Apresentação (Slides)
              </button>
            </div>

            <div className="text-xs text-slate-500 font-mono pt-4">
              iCanvas Technology Inc. • WhatsApp Direto: +55 (16) 99104-1695 • Documento Confidencial
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
