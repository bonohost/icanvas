import * as React from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'a-scene': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { [key: string]: any }, HTMLElement>;
      'a-sky': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { [key: string]: any }, HTMLElement>;
      'a-box': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { [key: string]: any }, HTMLElement>;
      'a-camera': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { [key: string]: any }, HTMLElement>;
    }
  }
}