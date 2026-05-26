import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ListboxModule } from 'primeng/listbox';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { IFormIndexEntry } from '../../interface/form_index.interface';
import { AreaColorService } from '../../services/area-color.service';

interface GroupedArea {
  areaName: string;
  displayName: string;
  color: string;
  forms: IFormIndexEntry[];
}

/**
 * Consulting Index Component
 *
 * Displays a navigable index of all forms in the consulting session workflow.
 * Enables quick navigation by allowing users to click on any specific form.
 *
 * @remarks
 * This component serves as a table of contents for the consultation process,
 * providing visual indicators for form status and area categorization.
 *
 * Features:
 * - Sequential form numbering
 * - Color-coded area tags with consistent hashing
 * - Visual distinction between active and completed forms
 * - Click-to-navigate functionality
 * - Responsive design with scrollable content
 * - Grouped by areas for better organization
 */
@Component({
  selector: 'app-consulting-index',
  standalone: true,
  imports: [CommonModule, FormsModule, ListboxModule, TagModule, MessageModule],
  templateUrl: './consulting-index.component.html',
  styleUrl: './consulting-index.component.scss',
})
export class ConsultingIndexComponent {
  private areaColorService = inject(AreaColorService);
  
  /**
   * Collection of form index entries for the consultation session.
   *
   * @remarks
   * Includes both completed forms and the currently active form,
   * ordered sequentially by form number.
   */
  @Input({ required: true }) formIndexEntries: IFormIndexEntry[] = [];

  /**
   * Event emitted when a user clicks on a form in the index.
   *
   * @remarks
   * Emits the zero-based index of the clicked form to enable
   * smooth scrolling navigation to that form in the parent component.
   */
  @Output() formSelected = new EventEmitter<number>();

  /**
   * Groups form entries by area.
   *
   * @returns Array of grouped areas with their forms
   */
  get groupedAreas(): GroupedArea[] {
    const groups = new Map<string, IFormIndexEntry[]>();
    
    this.formIndexEntries.forEach(entry => {
      const key = entry.areaName || 'initial';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(entry);
    });

    return Array.from(groups.entries()).map(([areaName, forms]) => ({
      areaName,
      displayName: areaName || 'Diagnóstico Inicial',
      color: areaName ? this.getHexColor(areaName) : '#6366f1',
      forms
    }));
  }

  /**
   * Handles click on a form entry.
   *
   * @remarks
   * Emits the formSelected event to notify the parent component,
   * which typically triggers navigation to the selected form.
   *
   * @param formNumber The form number to navigate to
   */
  onFormClick(formNumber: number): void {
    this.formSelected.emit(formNumber - 1);
  }

  /**
   * Gets the hex color for an area.
   * 
   * @remarks
   * Delegates to AreaColorService for consistent color assignment.
   * 
   * @param areaName The name of the KPI area
   * @returns Hex color string
   */
  getHexColor(areaName: string): string {
    return this.areaColorService.getHexColor(areaName);
  }

  /**
   * Gets RGBA color with transparency for an area.
   * 
   * @param areaName The name of the KPI area
   * @returns RGBA color string with 16% opacity
   */
  getRgbaColor(areaName: string): string {
    return this.areaColorService.getRgbaColor(areaName);
  }
}
