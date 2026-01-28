declare module 'react-leaflet' {
  import { ComponentType, ReactNode } from 'react';
  import * as L from 'leaflet';

  export interface MapContainerProps {
    center: L.LatLngExpression;
    zoom: number;
    style?: React.CSSProperties;
    className?: string;
    children?: ReactNode;
    scrollWheelZoom?: boolean;
  }

  export interface TileLayerProps {
    attribution?: string;
    url: string;
  }

  export interface MarkerProps {
    position: L.LatLngExpression;
    icon?: L.Icon;
    eventHandlers?: {
      click?: () => void;
      [key: string]: any;
    };
    children?: ReactNode;
  }

  export interface PopupProps {
    children?: ReactNode;
  }

  export interface TooltipProps {
    direction?: string;
    offset?: L.PointExpression;
    opacity?: number;
    permanent?: boolean;
    children?: ReactNode;
  }

  export const MapContainer: ComponentType<MapContainerProps>;
  export const TileLayer: ComponentType<TileLayerProps>;
  export const Marker: ComponentType<MarkerProps>;
  export const Popup: ComponentType<PopupProps>;
  export const Tooltip: ComponentType<TooltipProps>;
  export function useMap(): L.Map;
}
