import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DynamicFormContainerComponent } from '../../components/dynamic-form-container-component/dynamic-form-container-component.component';
import { ConsultingIndexComponent } from '../../components/consulting-index/consulting-index.component';
import { AssistantMessageComponent } from '../../components/assistant-message/assistant-message.component';
import { ChartComponent } from '../../components/chart/chart.component';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { AvatarModule } from 'primeng/avatar';
import { IKPIArea } from '../../interface/kpi_areas.interface';
import { IFormIndexEntry } from '../../interface/form_index.interface';
import { CommonModule } from '@angular/common';
import { ConsultingService } from '../../services/consulting.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { AreaColorService } from '../../services/area-color.service';
import { ChartConfiguration, ChartOptions } from 'chart.js';
@Component({
  selector: 'app-consultation-page',
  standalone: true,
  imports: [
    DynamicFormContainerComponent,
    ConsultingIndexComponent,
    AssistantMessageComponent,
    ButtonModule,
    TooltipModule,
    AvatarModule,
    CommonModule,
    ChartComponent,
    FormsModule,
  ],
  templateUrl: './consultation-page.component.html',
  styleUrl: './consultation-page.component.scss',
})
export class ConsultationPageComponent implements OnInit {
  private areaColorService = inject(AreaColorService);

  trackByAreaId(index: number, area: IKPIArea) {
    return area.id;
  }

  private readonly doughnutOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '80%',
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: false,
        callbacks: {
          label: (item: any) => ` ${item.label}: ${item.raw}/10`,
        },
      },
    },
  };

  public areasWithCharts: Array<
    IKPIArea & {
      chartData: ChartConfiguration['data'];
      chartOptions: ChartConfiguration['options'];
    }
  > = [];

  public overallChartData: ChartConfiguration['data'] = {
    labels: ['Progreso', 'Pendiente'],
    datasets: [
      {
        data: [0, 10],
        backgroundColor: ['rgba(54, 162, 235, 0.8)', '#b8bbc1'],
        hoverBackgroundColor: ['rgba(54, 162, 235, 0.8)', '#F3F4F6'],
        borderWidth: 0,
      },
    ],
  };

  public overallChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '80%',
    rotation: -90,
    circumference: 180,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
  };




  getAreaChartData(area: IKPIArea) {
    const areaColor = this.areaColorService.getHexColor(area.name);
    const score = area.actualScore;
    const remaining = Math.max(0, 10 - score);

    return {
      labels: ['Puntuación', 'Pendiente'],
      datasets: [{
        data: [score, remaining],
        backgroundColor: [areaColor, '#b8bbc1'],
        hoverBackgroundColor: [areaColor, '#F3F4F6'],
        borderWidth: 0,
      }]
    };
  }

  /**
   * User's full name (optional, for future use)
   */
  userName = '';
  /**
   * Consultation ID extracted from route parameters.
   * undefined indicates a new consultation should be created.
   * number indicates an existing consultation should be loaded.
   */
  consultingID?: number;

  /**
   * Optional title for the consultation, received from navigation state.
   * Used when creating a new consultation with a user-provided title.
   */
  consultationTitle?: string;

  /**
   * Current assistant message to display in the sidebar
   */
  currentAssistantMessage?: string;

  /**
   * KPI data: current area being evaluated
   */
  currentArea?: IKPIArea;

  /**
   * KPI data: all areas with their scores
   */
  allAreas: IKPIArea[] = [];

  /**
   * Mean velocity from backend (per-area progress during forms)
   */
  meanVelocity: number = 0;

  /**
   * Flag indicating if consultation is in proposal phase
   * When true, assistant avatar reflects global progress
   */
  isProposalPhase: boolean = false;

  /**
   * Calculated: Dictionary mapping area name to its score
   */
  scoreByArea: Record<string, number> = {};

  /**
 * Calculated: Mean score of all areas
 */
  meanAreasScore?: number;

  /**
 * Getter for meanAreasScore that returns 0 if null
 * Used for template binding where non-null number is required
 */
  get meanAreasScoreOrZero(): number {
    return this.meanAreasScore ?? 0;
  }

  /**
   * Calculates the mean score of all areas
   * @returns Average actualScore of all areas, or null if no areas exist
   */
  private calculateMeanAreasScore(): number | undefined {
    if (!this.allAreas || this.allAreas.length === 0) {
      return undefined;
    }

    const totalScore = this.allAreas.reduce(
      (sum, area) => sum + area.actualScore,
      0,
    );
    return Number(((totalScore / this.allAreas.length) * 10).toFixed(2));
  }

  /**
   * Índice de formularios (completados + activo)
   * Recibido desde DynamicFormContainerComponent
   */
  formIndexEntries: IFormIndexEntry[] = [];
  editingTitle = false;
  editableTitle = '';
  savingTitle = false;
  canEditTitle = true; // Puedes agregar lógica para permisos si lo necesitas

  userInitials = '';

  private consultingService = inject(ConsultingService);
  private authService = inject(AuthService);
  private userService = inject(UserService);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {
    // Get title from navigation state (must be done in constructor, not ngOnInit)
    const navigation = this.router.getCurrentNavigation();
    this.consultationTitle = navigation?.extras?.state?.['title'];
  }

  async ngOnInit() {
    // Extract consultation ID from route parameters
    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam) {
      // Load existing consultation
      this.consultingID = Number(idParam);
      // Fetch the latest title from backend
      try {
        const consulting = await this.consultingService
          .getConsultingById(this.consultingID)
          .toPromise();
        this.consultationTitle = consulting?.title || 'Consultoría sin título';
      } catch {
        this.consultationTitle = 'Consultoría sin título';
      }
    } else {
      // Create new consultation
      this.consultingID = undefined;
      // Title may come from navigation state (already set in constructor)
    }

    this.setUserInitials();
  }

  /**
   * Creates a dictionary mapping area names to their scores
   * @returns Object with area names as keys and actualScore as values
   */
  private calculateScoreByArea(): Record<string, number> {
    if (!this.allAreas || this.allAreas.length === 0) {
      return {};
    }

    return this.allAreas.reduce(
      (acc, area) => {
        acc[area.name] = area.actualScore;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Navigates back to the home page
   */
  navigateToHome(): void {
    this.router.navigate(['/home']);
  }

  /**
   * Handles consultation data updates from child component
   * Updates assistant message and KPIs data
   */
  /**
   * Handles consultation data updates from child component
   * Updates assistant message and KPIs data
   */
  onConsultationDataUpdated(data: {
    assistantMessage?: string;
    currentArea?: IKPIArea;
    allAreas?: IKPIArea[];     // optional: omitted when only flipping isProposalPhase
    meanVelocity?: number;
    isProposalPhase?: boolean;
  }): void {
    // Only update the assistant message when the event provides one
    if (data.assistantMessage !== undefined) {
      this.currentAssistantMessage = data.assistantMessage;
    }

    if (data.currentArea !== undefined) {
      this.currentArea = data.currentArea;
    }


    // Only replace the areas list when the event explicitly provides one
    // (proposal-phase emits intentionally omit allAreas to keep the existing list)
    if (data.allAreas !== undefined) {
      this.allAreas = data.allAreas;
      this.scoreByArea = this.calculateScoreByArea();
      this.areasWithCharts = this.allAreas.map((area) => ({
        ...area,
        chartData: this.getAreaChartData(area),
        chartOptions: this.doughnutOptions,
      }));
    }
    this.meanAreasScore = this.calculateMeanAreasScore();

    // Update overall chart data for meanAreasScore (gauge style)
    const meanScore = this.meanAreasScoreOrZero;
    this.overallChartData = {
      labels: ['Progreso', 'Pendiente'],
      datasets: [
        {
          data: [meanScore, 100 - meanScore],
          backgroundColor: ['rgba(54, 162, 235, 0.8)', '#b8bbc1'],
          hoverBackgroundColor: ['rgba(54, 162, 235, 0.8)', '#F3F4F6'],
          borderWidth: 0,
        },
      ],
    };



    // Update meanVelocity whenever provided — this is independent of proposal phase
    if (data.meanVelocity !== undefined) {
      this.meanVelocity = data.meanVelocity;
    }

    // Update proposal phase flag if provided
    if (data.isProposalPhase !== undefined) {
      this.isProposalPhase = data.isProposalPhase;
    }
  }

  /**
   * Maneja la actualización del índice de formularios desde el componente hijo
   * @param entries Array de entradas del índice
   */
  onFormIndexUpdate(entries: IFormIndexEntry[]): void {
    this.formIndexEntries = entries;
    this.cdr.detectChanges();
  }

  /**
   * Maneja la selección de un formulario desde el índice
   * Navega al formulario específico con scroll suave
   * @param formIndex Índice del formulario (0-based)
   */
  onFormSelectedFromIndex(formIndex: number): void {
    // Buscar el elemento del formulario por su data-attribute
    const formElement = document.querySelector(
      `[data-form-index="${formIndex}"]`,
    );

    if (formElement) {
      // Scroll suave al formulario
      formElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });

      // Agregar efecto visual temporal (highlight)
      formElement.classList.add('highlight-form');
      setTimeout(() => {
        formElement.classList.remove('highlight-form');
      }, 2000);
    }
  }

  enableTitleEdit() {
    if (!this.canEditTitle) return;
    this.editingTitle = true;
    this.editableTitle = this.consultationTitle || '';
    setTimeout(() => {
      const input = document.querySelector(
        '.edit-title-input',
      ) as HTMLInputElement;
      if (input) input.focus();
    });
  }

  /**
   * Handles updating the title of the current consulting session.
   * Calls the backend API to update the title and updates the local title.
   * Follows the pattern from HomePageComponent's updateTitle.
   */
  async saveTitleEdit() {
    if (!this.consultingID) {
      console.error('No consulting ID to update');
      this.editingTitle = false;
      return;
    }

    const newTitle = this.editableTitle.trim();
    if (!newTitle) {
      this.editingTitle = false;
      return;
    }

    this.savingTitle = true;

    try {
      // Call service to update title
      await this.consultingService
        .setTitle(this.consultingID, newTitle)
        .toPromise();

      // Fetch the updated consulting to ensure the title is correct
      const updatedConsulting = await this.consultingService
        .getConsultingById(this.consultingID)
        .toPromise();
      this.consultationTitle = updatedConsulting?.title || newTitle;
    } catch (error) {
      console.error('Error updating consulting title:', error);
      if (error instanceof Error) {
        alert(`Error al actualizar el nombre: ${error.message}`);
      } else {
        alert('Ocurrió un error inesperado al actualizar el nombre');
      }
    } finally {
      this.savingTitle = false;
      this.editingTitle = false;
    }
  }

  /**
   * Sets the user initials for the header avatar
   */
  setUserInitials() {
    this.loadUserData();
  }

  /**
   * Loads the authenticated user's data from the backend.
   * Extracts user ID from JWT token and fetches full user information.
   * Calculates user initials from first and last name.
   */
  private async loadUserData(): Promise<void> {
    try {
      const userId = this.authService.getNumUserIdFromToken();
      if (!userId) {
        console.error('No user ID found in token');
        this.authService.logout();
        this.router.navigate(['/login']);
        return;
      }
      const response = await this.userService.getUserById(userId).toPromise();
      if (response.code === 200 && response.data) {
        const user = response.data;
        this.userName = `${user.name || ''} ${user.lastName || ''}`.trim();
        this.userInitials = this.calculateInitials(
          user.name || '',
          user.lastName || '',
        );
        this.cdr.markForCheck();
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  /**
   * Calculates user initials from first and last name.
   * Takes the first character of each name, converts to uppercase.
   * @param firstName User's first name
   * @param lastName User's last name
   * @returns Initials string (e.g., "JP" for "Juan Pérez")
   */
  private calculateInitials(firstName: string, lastName: string): string {
    const firstInitial = firstName.charAt(0).toUpperCase();
    const lastInitial = lastName.charAt(0).toUpperCase();
    return `${firstInitial}${lastInitial}`;
  }
}
