import { Injectable } from '@angular/core';

/**
 * AreaColorService
 * 
 * Centralized service for managing consistent color assignment to KPI areas.
 * 
 * @remarks
 * Assigns vivid colors from PrimeNG's color palette to area names in a deterministic
 * way, ensuring the same area always gets the same color and no two areas share
 * the same color (until all colors are used).
 * 
 * Features:
 * - Deterministic assignment based on area name
 * - No color repetition until all colors are used
 * - Expanded palette with 18 vivid colors
 * - Returns both hex values and PrimeNG CSS variables
 */
@Injectable({
  providedIn: 'root'
})
export class AreaColorService {
  /**
   * Extended palette of vivid colors from PrimeNG.
   * Excludes blacks, whites, and grays for better visual distinction.
   */
  private readonly colorPalette = [
    { name: 'emerald', hex: '#10b981', variable: 'emerald.500' },
    { name: 'green', hex: '#22c55e', variable: 'green.500' },
    { name: 'lime', hex: '#84cc16', variable: 'lime.500' },
    { name: 'teal', hex: '#14b8a6', variable: 'teal.500' },
    { name: 'cyan', hex: '#06b6d4', variable: 'cyan.500' },
    { name: 'sky', hex: '#0ea5e9', variable: 'sky.500' },
    { name: 'blue', hex: '#3b82f6', variable: 'blue.500' },
    { name: 'indigo', hex: '#6366f1', variable: 'indigo.500' },
    { name: 'violet', hex: '#8b5cf6', variable: 'violet.500' },
    { name: 'purple', hex: '#a855f7', variable: 'purple.500' },
    { name: 'fuchsia', hex: '#d946ef', variable: 'fuchsia.500' },
    { name: 'pink', hex: '#ec4899', variable: 'pink.500' },
    { name: 'rose', hex: '#f43f5e', variable: 'rose.500' },
    { name: 'red', hex: '#ef4444', variable: 'red.500' },
    { name: 'orange', hex: '#f97316', variable: 'orange.500' },
    { name: 'amber', hex: '#f59e0b', variable: 'amber.500' },
    { name: 'yellow', hex: '#eab308', variable: 'yellow.500' },
    { name: 'lime-600', hex: '#65a30d', variable: 'lime.600' }, // Darker lime for variety
  ];

  /**
   * Map to track which colors have been assigned to which areas.
   * Key: area name, Value: assigned color
   */
  private areaColorMap: Map<string, typeof this.colorPalette[0]> = new Map();

  /**
   * Set to track which colors from the palette are already assigned.
   */
  private usedColorIndices: Set<number> = new Set();

  /**
   * Gets a consistent color for an area name.
   * 
   * @remarks
   * Uses a deterministic hash function to assign colors based on area name.
   * Ensures no color repetition until all colors in the palette are used.
   * After all colors are used, it starts reusing them.
   * 
   * @param areaName The name of the KPI area
   * @returns Color object with hex value and CSS variable reference
   */
  getColorForArea(areaName: string): { hex: string; variable: string; name: string } {
    // Return cached color if already assigned
    if (this.areaColorMap.has(areaName)) {
      return this.areaColorMap.get(areaName)!;
    }

    // Calculate hash from area name
    const hash = this.hashString(areaName);
    
    // Try to find an unused color using the hash as starting point
    let colorIndex = hash % this.colorPalette.length;
    let attempts = 0;

    // If all colors are used, reset the tracking
    if (this.usedColorIndices.size >= this.colorPalette.length) {
      this.usedColorIndices.clear();
    }

    // Find the next available color starting from the hashed index
    while (this.usedColorIndices.has(colorIndex) && attempts < this.colorPalette.length) {
      colorIndex = (colorIndex + 1) % this.colorPalette.length;
      attempts++;
    }

    // Assign the color
    const assignedColor = this.colorPalette[colorIndex];
    this.areaColorMap.set(areaName, assignedColor);
    this.usedColorIndices.add(colorIndex);

    return assignedColor;
  }

  /**
   * Gets the hex color value for an area.
   * 
   * @param areaName The name of the KPI area
   * @returns Hex color string (e.g., '#10b981')
   */
  getHexColor(areaName: string): string {
    return this.getColorForArea(areaName).hex;
  }

  /**
   * Gets the PrimeNG CSS variable reference for an area.
   * 
   * @param areaName The name of the KPI area
   * @returns CSS variable reference (e.g., 'emerald.500')
   */
  getCSSVariable(areaName: string): string {
    return this.getColorForArea(areaName).variable;
  }

  /**
   * Converts hex color to rgba format with specified opacity.
   * 
   * @param hex Hex color string (e.g., '#10b981')
   * @param opacity Opacity value between 0 and 1 (default: 0.16 for PrimeNG style)
   * @returns RGBA color string (e.g., 'rgba(16, 185, 129, 0.16)')
   */
  private hexToRgba(hex: string, opacity: number = 0.16): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  /**
   * Gets RGBA color with transparency for an area.
   * Perfect for tag backgrounds with PrimeNG's transparent style.
   * 
   * @param areaName The name of the KPI area
   * @param opacity Opacity value between 0 and 1 (default: 0.16)
   * @returns RGBA color string (e.g., 'rgba(16, 185, 129, 0.16)')
   */
  getRgbaColor(areaName: string, opacity: number = 0.16): string {
    const hex = this.getHexColor(areaName);
    return this.hexToRgba(hex, opacity);
  }

  /**
   * Simple but effective hash function for strings.
   * 
   * @remarks
   * Generates a deterministic numeric hash from a string.
   * Same string always produces the same hash value.
   * 
   * @param str String to hash
   * @returns Positive integer hash value
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Resets all color assignments.
   * 
   * @remarks
   * Useful for testing or when starting a fresh consultation session.
   */
  reset(): void {
    this.areaColorMap.clear();
    this.usedColorIndices.clear();
  }

  /**
   * Pre-assigns colors to a list of area names.
   * 
   * @remarks
   * Useful when you know all area names upfront and want to ensure
   * optimal color distribution.
   * 
   * @param areaNames Array of area names to pre-assign colors
   */
  preAssignColors(areaNames: string[]): void {
    areaNames.forEach(name => this.getColorForArea(name));
  }

  /**
   * Gets all currently assigned colors.
   * 
   * @returns Map of area names to their assigned colors
   */
  getAssignedColors(): Map<string, { hex: string; variable: string; name: string }> {
    return new Map(this.areaColorMap);
  }
}
