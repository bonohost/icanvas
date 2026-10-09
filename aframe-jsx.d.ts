import * as React from 'react';

type AFrameIntrinsicElementProps = Omit<React.HTMLAttributes<HTMLElement>, 'draggable'> & {
  [key: string]: any;
  draggable?: string;
  'collada-model'?: string;
  'gltf-model'?: string;
  id?: string;
  src?: string;
  position?: string;
  rotation?: string;
  scale?: string;
  material?: string;
  shadow?: string;
};

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'a-scene': React.DetailedHTMLProps<AFrameIntrinsicElementProps, HTMLElement>;
      'a-assets': React.DetailedHTMLProps<AFrameIntrinsicElementProps, HTMLElement>;
      'a-asset-item': React.DetailedHTMLProps<AFrameIntrinsicElementProps, HTMLElement>;
      'a-sky': React.DetailedHTMLProps<AFrameIntrinsicElementProps, HTMLElement>;
      'a-box': React.DetailedHTMLProps<AFrameIntrinsicElementProps, HTMLElement>;
      'a-cylinder': React.DetailedHTMLProps<AFrameIntrinsicElementProps, HTMLElement>;
      'a-ring': React.DetailedHTMLProps<AFrameIntrinsicElementProps, HTMLElement>;
      'a-sphere': React.DetailedHTMLProps<AFrameIntrinsicElementProps, HTMLElement>;
      'a-plane': React.DetailedHTMLProps<AFrameIntrinsicElementProps, HTMLElement>;
      'a-circle': React.DetailedHTMLProps<AFrameIntrinsicElementProps, HTMLElement>;
      'a-triangle': React.DetailedHTMLProps<AFrameIntrinsicElementProps, HTMLElement>;
      'a-cone': React.DetailedHTMLProps<AFrameIntrinsicElementProps, HTMLElement>;
      'a-text': React.DetailedHTMLProps<AFrameIntrinsicElementProps, HTMLElement>;
      'a-cursor': React.DetailedHTMLProps<AFrameIntrinsicElementProps, HTMLElement>;
      'a-camera': React.DetailedHTMLProps<AFrameIntrinsicElementProps, HTMLElement>;
      'a-entity': React.DetailedHTMLProps<AFrameIntrinsicElementProps, HTMLElement>;
    }
  }
}