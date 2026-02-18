import React, { useState, useEffect } from 'react';
import type { LatLngTuple, LatLngExpression } from 'leaflet';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const pinSvg = (color: string) =>
  `
  <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 0C7.163 0 0 7.163 0 16c0 6.627 7.163 18.627 14.222 23.98a2.5 2.5 0 0 0 3.556 0C24.837 34.627 32 22.627 32 16 32 7.163 24.837 0 16 0zm0 22a6 6 0 1 1 0-12 6 6 0 0 1 0 12z" fill="${color}"/>
    <circle cx="16" cy="16" r="5" fill="rgba(0,0,0,0.12)"/>
  </svg>
`.trim();

const blueIcon = L.divIcon({
  className: 'custom-div-icon',
  html: pinSvg('#1e88e5'),
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -40],
});

interface MapProps {
  onMapClick?: (lat: number, lng: number) => void;
  markerPosition?: LatLngTuple;
  height?: string;
}

const MapEventsHandler: React.FC<{ onClick: (lat: number, lng: number) => void }> = ({
  onClick,
}) => {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      onClick(lat, lng);
    },
  });
  return null;
};

const MapUpdater: React.FC<{ position?: LatLngTuple }> = ({ position }) => {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, 13);
    }
  }, [position, map]);

  return null;
};

const Map: React.FC<MapProps> = ({ onMapClick, markerPosition, height = '400px' }) => {
  const [position, setPosition] = useState<LatLngTuple | undefined>(markerPosition);

  useEffect(() => {
    if (markerPosition) {
      setPosition(markerPosition);
    }
  }, [markerPosition]);

  const handleMapClick = (lat: number, lng: number) => {
    const newPos: LatLngTuple = [lat, lng];
    setPosition(newPos);
    onMapClick?.(lat, lng);
  };

  const center: LatLngExpression = position || [25.2048, 55.2708]; // Dubai, UAE
  const zoom = position ? 13 : 10;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height, width: '100%' }}
      maxZoom={18}
      minZoom={5}
    >
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {onMapClick && <MapEventsHandler onClick={handleMapClick} />}
      <MapUpdater position={position} />
      {position && (
        <Marker position={position} icon={blueIcon}>
          <Popup>
            Lat: {position[0].toFixed(6)}, Lng: {position[1].toFixed(6)}
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
};

export default Map;
