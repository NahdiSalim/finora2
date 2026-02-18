// Type augmentation to fix React 19 compatibility with react-leaflet
import 'react';
import type { MapContainerProps, TileLayerProps, MarkerProps, PopupProps } from 'react-leaflet';

declare module 'react-leaflet' {
  import type { FC, PropsWithChildren } from 'react';

  export const MapContainer: FC<PropsWithChildren<MapContainerProps>>;
  export const TileLayer: FC<TileLayerProps>;
  export const Marker: FC<PropsWithChildren<MarkerProps>>;
  export const Popup: FC<PropsWithChildren<PopupProps>>;
}
