declare module 'react-dock' {

  import * as React from 'react';

  interface Props {
    position: 'left' | 'right' | 'top' | 'bottom',
    zIndex?: number,
    fluid?: boolean,
    size?: number,
    defaultSize?: number,
    dimMode?: 'none' | 'transparent' | 'opaque',
    isVisible: boolean,
    onVisibleChange?: (isVisible: boolean) => void,
    onSizeChange?: (size: number) => void,
    dimStyle?: object,
    dockStyle?: object,
    duration?: number
  }

  export default class Dock extends React.Component<Props> {}
}
