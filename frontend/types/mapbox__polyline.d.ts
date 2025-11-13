declare module '@mapbox/polyline' {
  export function decode(str: string, precision?: number): number[][];
  export function encode(coordinates: number[][], precision?: number): string;
}