import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IKPIArea } from '../../interface/kpi_areas.interface';

/**
 * Component to display assistant messages in the consultation sidebar.
 * Receives messages from the parent component and displays them with proper formatting.
 * Uses ngOnChanges to handle message updates in a modular way.
 * Features animated typing indicator and typewriter effect for messages.
 */
@Component({
  selector: 'app-assistant-message',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './assistant-message.component.html',
  styleUrl: './assistant-message.component.scss',
})
export class AssistantMessageComponent implements OnChanges {
  /**
   * Velocity threshold constants for emotional feedback (per-area progress)
   */
  private static readonly VELOCITY_THRESHOLD_SAD = 0.4;
  private static readonly VELOCITY_THRESHOLD_NEUTRAL = 1.3;

  /**
   * Global progress threshold constants for final proposal phase
   */
  private static readonly GLOBAL_PROGRESS_THRESHOLD_SAD = 5.0;
  private static readonly GLOBAL_PROGRESS_THRESHOLD_NEUTRAL = 7.0;

  /**
   * Assistant image paths constants
   */
  private static readonly IMAGE_PATH_SAD = '../../../assets/sad_assistant.png';
  private static readonly IMAGE_PATH_NEUTRAL =
    '../../../assets/neutral_assistant.png';
  private static readonly IMAGE_PATH_HAPPY =
    '../../../assets/happy_assistant.png';

  /**
   * Animation timing constants (in milliseconds)
   */
  private static readonly TYPING_INDICATOR_DURATION_MS = 1500;
  private static readonly TYPEWRITER_CHARACTER_DELAY_MS = 30;

  /**
   * The assistant message to display
   */
  @Input() message?: string;

  /**
   * Mean velocity of clarification (can be negative, 0, or positive)
   * Determines which assistant image to display based on response quality:
   */
  @Input() meanVelocity: number = 0;

  /**
   * Array of KPI areas for calculating global progress in proposal phase
   */
  @Input() areas?: IKPIArea[];

  /**
   * Flag to indicate if we're in the proposal phase
   * When true, avatar changes based on global progress instead of meanVelocity
   */


  /**
   * Flag to track if there's currently a message to display
   */
  hasMessage: boolean = false;

  /**
   * Flag to show typing indicator animation
   */
  isTyping: boolean = false;

  /**
   * The message text being displayed with typewriter effect
   */
  displayedMessage: string = '';

  /**
   * Path to the current assistant image based on score
   */
  assistantImagePath: string = AssistantMessageComponent.IMAGE_PATH_NEUTRAL;

  /**
   * Timeout reference for typewriter effect cleanup
   */
  private typewriterTimeout?: ReturnType<typeof setTimeout>;

  /**
   * Angular lifecycle hook that responds to input property changes.
   * Modularized to handle specific change detection for inputs.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['meanVelocity'] && !changes['meanVelocity'].firstChange) {
      this.handleVelocityChange(changes['meanVelocity'].currentValue);
    }

    if (changes['message']) {
      this.handleMessageChange(changes['message'].currentValue);
    }
  }

  /**
   * Handles changes in the mean velocity.
   * Updates the assistant image based on the response quality feedback.
   *
   * @param velocity The new mean velocity value
   */
  private handleVelocityChange(velocity: number): void {
    if (velocity < AssistantMessageComponent.VELOCITY_THRESHOLD_SAD) {
      this.assistantImagePath = AssistantMessageComponent.IMAGE_PATH_SAD;
    } else if (
      velocity <= AssistantMessageComponent.VELOCITY_THRESHOLD_NEUTRAL
    ) {
      this.assistantImagePath = AssistantMessageComponent.IMAGE_PATH_NEUTRAL;
    } else {
      this.assistantImagePath = AssistantMessageComponent.IMAGE_PATH_HAPPY;
    }
  }

  

  /**
   * Modular handler for message changes.
   * Processes the new message and triggers typing animation.
   *
   * @param newMessage The new message value from the input
   */
  private handleMessageChange(newMessage?: string): void {
    // Clear any existing typewriter effect
    if (this.typewriterTimeout) {
      clearTimeout(this.typewriterTimeout);
    }

    // Update the hasMessage flag
    this.hasMessage = !!newMessage && newMessage.trim().length > 0;

    if (this.hasMessage && newMessage) {
      // Show typing indicator first
      this.isTyping = true;
      this.displayedMessage = '';

      // After typing indicator duration, start typewriter effect
      this.typewriterTimeout = setTimeout(() => {
        this.isTyping = false;
        this.startTypewriterEffect(newMessage);
      }, AssistantMessageComponent.TYPING_INDICATOR_DURATION_MS);
    } else {
      this.isTyping = false;
      this.displayedMessage = '';
    }
  }

  /**
   * Animates the message text with a typewriter effect.
   * Displays characters one by one with a delay.
   *
   * @param fullMessage The complete message to display
   */
  private startTypewriterEffect(fullMessage: string): void {
    let currentIndex = 0;
    this.displayedMessage = '';

    const typeNextCharacter = () => {
      if (currentIndex < fullMessage.length) {
        this.displayedMessage += fullMessage[currentIndex];
        currentIndex++;
        this.typewriterTimeout = setTimeout(
          typeNextCharacter,
          AssistantMessageComponent.TYPEWRITER_CHARACTER_DELAY_MS,
        );
      }
    };

    typeNextCharacter();
  }
}
