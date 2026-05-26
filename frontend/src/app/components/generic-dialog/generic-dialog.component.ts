import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';

/**
 * Interface for dialog button configuration
 */
export interface DialogButton {
  label: string;
  icon: string;
  styleClass: string;
  loading?: boolean;
  disabled?: boolean;
  callback: () => void;
}

/**
 * Generic Dialog Component
 *
 * Reusable modal component that can be configured to display different types of dialogs
 * with customizable header, content, optional input field, warning message, and action buttons.
 *
 *
 */
@Component({
  selector: 'app-generic-dialog',
  imports: [
    CommonModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    FormsModule,
  ],
  templateUrl: './generic-dialog.component.html',
  styleUrl: './generic-dialog.component.scss',
})
export class GenericDialogComponent {
  /**
   * Controls the visibility of the dialog.
   * Two-way binding supported via [(visible)]
   */
  @Input() visible: boolean = false;

  /**
   * Dialog title displayed in the header
   */
  @Input() title: string = '';

  /**
   * Icon class for the header icon (e.g., 'pi pi-check')
   */
  @Input() icon: string = '';

  /**
   * Description or main content of the dialog.
   * Supports HTML content.
   */
  @Input() description: string = '';

  /**
   * Whether to show an input field in the dialog body.
   * Default: false
   */
  @Input() showInput: boolean = false;

  /**
   * Label for the input field
   */
  @Input() inputLabel: string = '';

  /**
   * Placeholder text for the input field
   */
  @Input() inputPlaceholder: string = '';

  /**
   * Value of the input field.
   * Two-way binding supported via [(inputValue)]
   */
  @Input() inputValue: string = '';

  /**
   * Whether the input field is optional.
   * Displays an "(opcional)" badge next to the label.
   * Default: false
   */
  @Input() inputOptional: boolean = false;

  /**
   * Whether the input field is disabled.
   * Default: false
   */
  @Input() inputDisabled: boolean = false;

  /**
   * Whether pressing Enter in the input should trigger the primary action button.
   * Default: false
   */
  @Input() submitOnEnter: boolean = false;

  /**
   * Warning message to display below the description.
   * Typically used for destructive actions.
   */
  @Input() warningMessage: string = '';

  /**
   * Array of button configurations for the dialog footer.
   * Each button can have a label, icon, style class, loading state, and callback.
   */
  @Input() buttons: DialogButton[] = [];

  /**
   * Custom style class for the p-dialog element.
   * Used to apply specific theme styles.
   */
  @Input() styleClass: string = 'generic-dialog';

  /**
   * Emits when the visible state changes.
   * Used for two-way binding [(visible)]
   */
  @Output() visibleChange = new EventEmitter<boolean>();

  /**
   * Emits when the input value changes.
   * Used for two-way binding [(inputValue)]
   */
  @Output() inputValueChange = new EventEmitter<string>();

  /**
   * Emits when the dialog is hidden/closed.
   * Called when user clicks outside, presses ESC, or closes via X button.
   */
  @Output() onHide = new EventEmitter<void>();

  /**
   * Handles visibility changes from the p-dialog component.
   * Updates the visible state and emits the change event.
   *
   * @param {boolean} newVisible - New visibility state
   */
  onVisibleChange(newVisible: boolean): void {
    this.visible = newVisible;
    this.visibleChange.emit(newVisible);
  }

  /**
   * Handles the dialog hide event.
   * Emits the onHide event to the parent component.
   */
  handleHide(): void {
    this.onHide.emit();
  }

  /**
   * Handles input value changes.
   * Emits the new value to support two-way binding.
   *
   * @param {string} newValue - New input value
   */
  onInputChange(newValue: string): void {
    this.inputValue = newValue;
    this.inputValueChange.emit(newValue);
  }

  /**
   * Handles button click events.
   * Executes the button's callback function.
   *
   * @param {DialogButton} button - Button configuration object
   */
  onButtonClick(button: DialogButton): void {
    if (button.callback) {
      button.callback();
    }
  }

  /**
   * Handles Enter key press on input and triggers primary action when enabled.
   */
  onInputEnter(event: Event): void {
    if (!this.submitOnEnter || this.inputDisabled || !this.visible) {
      return;
    }

    const primaryButton = this.buttons.find(
      (button) => !button.disabled && !button.loading,
    );

    if (!primaryButton?.callback) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    primaryButton.callback();
  }
}
