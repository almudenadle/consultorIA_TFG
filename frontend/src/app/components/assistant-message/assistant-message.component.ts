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
   * Default messages shown when entering the proposal phase,
   * one per score tier. They are displayed via the typewriter animation.
   */
  private static readonly PROPOSAL_MESSAGE_SAD =
    ' El diagnóstico revela áreas con margen de mejora significativo. '
    + 'He preparado una propuesta centrada en los puntos más críticos para '
    + 'que puedas empezar a revertir la situación cuanto antes.';

  private static readonly PROPOSAL_MESSAGE_NEUTRAL =
    'El diagnóstico muestra una base sólida con algunas oportunidades '
    + 'claras de crecimiento. He generado una propuesta personalizada para '
    + 'que puedas llevar tu negocio al siguiente nivel.';

  private static readonly PROPOSAL_MESSAGE_HAPPY =
    '¡Excelente diagnóstico! Tu empresa muestra una madurez muy alta en '
    + 'las áreas analizadas. He preparado una propuesta orientada a '
    + 'consolidar y seguir ampliando esa ventaja competitiva.';

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
  @Input() isProposalPhase: boolean = false;

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
    // True only in the exact cycle where isProposalPhase flips to true.
    const justEnteredProposalPhase =
      !!changes['isProposalPhase'] &&
      changes['isProposalPhase'].currentValue === true &&
      changes['isProposalPhase'].previousValue !== true;

    if (this.isProposalPhase) {
      if (changes['isProposalPhase'] || changes['areas']) {
        this.handleGlobalProgressChange(justEnteredProposalPhase);
      }
    } else {
      // Outside proposal phase: avatar tracks meanVelocity.
      if (changes['meanVelocity'] && !changes['meanVelocity'].firstChange) {
        this.handleVelocityChange(changes['meanVelocity'].currentValue);
      }
    }

    // Skip updating the message from the parent input when we just entered
    // proposal phase: handleGlobalProgressChange already injected the right
    // phase-specific message; processing 'changes.message' here would
    // overwrite it with the stale last form message.
    if (changes['message'] && !justEnteredProposalPhase) {
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
   * Calculates global progress when in proposal phase.
   * Uses the average of actualScore from all areas to determine avatar state.
   * Thresholds:
   * - < 5.0: SAD
   * - 5.0-7.0: NEUTRAL
   * - > 7.0: HAPPY
   *
   * @param justEntered True only when isProposalPhase just flipped to true.
   *   When true, always injects the default proposal-tier message.
   */
  private handleGlobalProgressChange(justEntered: boolean = false): void {
    // If there are no areas yet we fall back to neutral with no message change.
    if (!this.areas || this.areas.length === 0) {
      this.assistantImagePath = AssistantMessageComponent.IMAGE_PATH_NEUTRAL;
      return;
    }

    // Calculate average of actualScore from all areas
    const totalScore = this.areas.reduce(
      (sum, area) => sum + area.actualScore,
      0,
    );
    const globalScore = totalScore / this.areas.length;

    let proposalMessage: string;

    if (globalScore < AssistantMessageComponent.GLOBAL_PROGRESS_THRESHOLD_SAD) {
      this.assistantImagePath = AssistantMessageComponent.IMAGE_PATH_SAD;
      proposalMessage = AssistantMessageComponent.PROPOSAL_MESSAGE_SAD;
    } else if (
      globalScore <= AssistantMessageComponent.GLOBAL_PROGRESS_THRESHOLD_NEUTRAL
    ) {
      this.assistantImagePath = AssistantMessageComponent.IMAGE_PATH_NEUTRAL;
      proposalMessage = AssistantMessageComponent.PROPOSAL_MESSAGE_NEUTRAL;
    } else {
      this.assistantImagePath = AssistantMessageComponent.IMAGE_PATH_HAPPY;
      proposalMessage = AssistantMessageComponent.PROPOSAL_MESSAGE_HAPPY;
    }

    // Always show the proposal message the first time we enter the phase.
    // On subsequent area updates we leave the displayed message as-is.
    if (justEntered) {
      this.handleMessageChange(proposalMessage);
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
