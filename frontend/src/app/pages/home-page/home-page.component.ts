import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ProgressSpinner } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { ConsultingService } from '../../services/consulting.service';
import { ConsultingSummary } from '../../interface/consulting_sumary.interface';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ErrorService } from '../../services/error.service';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { TooltipModule } from 'primeng/tooltip';
import { MenuModule } from 'primeng/menu';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { PaginatorModule } from 'primeng/paginator';
import { ProgressBarModule } from 'primeng/progressbar';
import { Menu } from 'primeng/menu';
import {
  GenericDialogComponent,
  DialogButton,
} from '../../components/generic-dialog/generic-dialog.component';

/**
 * Home Page Component
 *
 * The main dashboard page displayed after successful user authentication.
 * This component provides:
 * - Overview of all user's consultations in a table format
 * - Navigation to create new consultations
 * - Navigation to view/continue existing consultations
 * - User logout functionality
 *
 * The consultation list is fetched from the backend on component initialization
 * and displays key information like consultation ID, status, and timestamps.
 *
 * User actions:
 * - Click on a consultation row to view/continue it
 * - Create a new consultation via the "New Consultation" button
 * - Logout via the logout button
 */
@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    ButtonModule,
    CardModule,
    TableModule,
    ProgressSpinner,
    DialogModule,
    InputTextModule,
    FormsModule,
    CommonModule,
    TooltipModule,
    ToastModule,
    MenuModule,
    AvatarModule,
    BadgeModule,
    PaginatorModule,
    ProgressBarModule,
    GenericDialogComponent,
  ],
  providers: [MessageService],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent implements OnInit {
  // Services injected using modern Angular inject() function
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private router = inject(Router);
  private consultingService = inject(ConsultingService);
  private messageService = inject(MessageService);
  private errorService = inject(ErrorService);

  /**
   * Full name of the authenticated user.
   * Displayed in the header avatar section.
   */
  userName = '';

  /**
   * User initials derived from first name and last name.
   * Displayed in the avatar circle.
   */
  userInitials = '';

  /**
   * List of consultation summaries for the authenticated user.
   * Populated on initialization from the backend.
   * undefined while loading, array (possibly empty) after load.
   */
  consultings?: ConsultingSummary[];

  /**
   * Current active filter for consultations.
   * 'all' shows all consultations, 'active' shows only active ones, 'finished' shows completed ones.
   */
  currentFilter: 'all' | 'active' | 'finished' = 'all';

  /**
   * Search term for filtering consultations by title.
   * Updates in real-time as user types in the search bar.
   */
  searchTerm = '';

  /**
   * Current page index for pagination (0-based).
   */
  currentPage = 0;

  /**
   * Number of consultations to display per page.
   */
  rowsPerPage = 8;

  /**
   * Timestamp of the last time consultings were fetched from the backend.
   * Used to implement throttling and prevent excessive API calls.
   */
  private lastRefreshTime: number = 0;

  /**
   * Minimum time in milliseconds that must pass between consecutive API calls.
   * Set to 5 seconds to balance freshness and performance.
   */
  private readonly REFRESH_RETRIEVING_CONSULTINGS_MS = 5000;

  /**
   * Controls the visibility of the title dialog modal.
   * Set to true when user clicks "New Consultation" button.
   */
  showTitleDialog = false;

  /**
   * Stores the optional title entered by the user for a new consultation.
   * Empty string by default (optional field).
   */
  consultationTitle = '';

  /**
   * Flag to track if the title dialog is in submitting state.
   */
  isSubmittingTitle = false;

  /**
   * Indicates if the modal is in editing mode (true) or creating mode (false).
   */
  isEditingMode = false;

  /**
   * Stores the ID of the consulting being edited, undefined when creating new.
   */
  editingConsultingId?: number;

  /**
   * Stores the current title of the consulting being edited (for placeholder).
   */
  currentEditingTitle = '';

  /**
   * Controls the visibility of the delete confirmation dialog modal.
   */
  showDeleteDialog = false;

  /**
   * Stores the ID of the consulting to be deleted.
   */
  deletingConsultingId?: number;

  /**
   * Stores the title of the consulting being deleted (for display).
   */
  deletingConsultingTitle = '';

  /**
   * Flag to track if the delete action is in progress.
   */
  isDeletingConsulting = false;

  /**
   * Lifecycle hook: Fetches user data and consultations for the current user on component initialization.
   * Implements throttling to prevent excessive API calls when navigating back from consultations.
   * Will only refresh if enough time has passed since the last refresh.
   */
  async ngOnInit(): Promise<void> {
    await this.loadUserData();
    await this.refreshConsultingsIfNeeded();
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

      const response = await firstValueFrom(
        this.userService.getUserById(userId),
      );

      if (response.code === 200 && response.data) {
        const user = response.data;
        this.userName = `${user.name || ''} ${user.lastName || ''}`.trim();
        this.userInitials = this.calculateInitials(
          user.name || '',
          user.lastName || '',
        );
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  /**
   * Calculates user initials from first and last name.
   * Takes the first character of each name, converts to uppercase.
   *
   * @param firstName User's first name
   * @param lastName User's last name
   * @returns Initials string (e.g., "JP" for "Juan Pérez")
   */
  private calculateInitials(firstName: string, lastName: string): string {
    const firstInitial = firstName.charAt(0).toUpperCase();
    const lastInitial = lastName.charAt(0).toUpperCase();
    return `${firstInitial}${lastInitial}`;
  }

  /**
   * Refreshes the consultations list from the backend if enough time has passed
   * since the last refresh. This ensures the list is updated with the latest
   * lastTimeAccessed ordering without overloading the database.
   */
  private async refreshConsultingsIfNeeded(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRefresh = now - this.lastRefreshTime;

    if (
      timeSinceLastRefresh < this.REFRESH_RETRIEVING_CONSULTINGS_MS &&
      this.consultings
    ) {
      return;
    }

    this.lastRefreshTime = now;
    this.consultings = await firstValueFrom(
      this.consultingService.getConsultingsByUser(),
    );
  }

  /**
   * Navigates to the consultation page.
   * Handles both viewing existing consultations and creating new ones.
   *
   * @param id Optional consultation ID. If provided, navigates to view/continue
   *           that specific consultation. If omitted, opens the title dialog modal.
   */
  consultation(id?: number) {
    if (id) {
      // Navigate to existing consultation
      this.router.navigate(['/consultations', id]);
    } else {
      // Show title dialog for new consultation
      this.isEditingMode = false;
      this.editingConsultingId = undefined;
      this.currentEditingTitle = '';
      this.showTitleDialog = true;
      this.consultationTitle = '';
    }
  }

  /**
   * Logs out the current user and redirects to the login page.
   * Clears authentication state via AuthService.
   */
  logout(): void {
    this.authService.logout();
    this.router.navigate(['']);
  }

  /**
   * Formats a date string or Date object to Spanish format: "DD de MMM. YYYY"
   * Example: "30 de ene. 2026"
   *
   * @param {string | Date} dateInput - ISO date string or Date object to format
   * @returns {string} Formatted date in Spanish format
   */
  formatDate(dateInput: string | Date): string {
    const date =
      typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const day = date.getDate();
    const monthIndex = date.getMonth();
    const year = date.getFullYear();

    const months = [
      'ene.',
      'feb.',
      'mar.',
      'abr.',
      'may.',
      'jun.',
      'jul.',
      'ago.',
      'sept.',
      'oct.',
      'nov.',
      'dic.',
    ];

    return `${day} de ${months[monthIndex]} ${year}`;
  }

  /**
   * Opens the title dialog in edit mode to update a consulting's name.
   * Uses the same modal as creating consultations but with different context.
   *
   * @param {number} id - The ID of the consulting to rename
   * @param {string} currentTitle - The current title of the consulting
   * @param {Event} event - DOM event to prevent row click propagation
   */
  updateConsultingName(id: number, currentTitle: string, event: Event): void {
    // Prevent row click event from firing
    event.stopPropagation();

    // Set modal to editing mode
    this.isEditingMode = true;
    this.editingConsultingId = id;
    this.currentEditingTitle = currentTitle || 'Consultoría sin título';
    this.consultationTitle = ''; // Start with empty input
    this.showTitleDialog = true;
  }

  /**
   * Gets the display status text for a consulting session based on the status enum.
   * ConsultingStatus: 0 = ACTIVE, 1 = FINISHED
   *
   * @param {ConsultingSummary} consulting - The consulting session to check
   * @returns {'Active' | 'Finished'} Status text to display
   */
  getStatusText(consulting: ConsultingSummary): 'Active' | 'Finished' {
    return consulting.statusCons === 1 ? 'Finished' : 'Active';
  }

  /**
   * Gets the CSS class for the status badge based on the status enum.
   * ConsultingStatus: 0 = ACTIVE, 1 = FINISHED
   *
   * @param {ConsultingSummary} consulting - The consulting session to check
   * @returns {'status-active' | 'status-finished'} CSS class name
   */
  getStatusClass(
    consulting: ConsultingSummary,
  ): 'status-active' | 'status-finished' {
    return consulting.statusCons === 1 ? 'status-finished' : 'status-active';
  }

  /**
   * Returns filtered consultations based on the current filter selection and search term.
   * Filters by consultation status (active, finished, or all) and title search.
   * ConsultingStatus enum: ACTIVE = 0, FINISHED = 1
   *
   * @returns {ConsultingSummary[] | undefined} Filtered list of consultations or undefined if loading
   */
  get filteredConsultings(): ConsultingSummary[] | undefined {
    if (!this.consultings) {
      return undefined;
    }

    let filtered = this.consultings;

    // Apply status filter
    if (this.currentFilter !== 'all') {
      filtered = filtered.filter((consulting) => {
        const status = Number(consulting.statusCons);

        if (this.currentFilter === 'active') {
          return status === 0;
        } else if (this.currentFilter === 'finished') {
          return status === 1;
        }
        return true;
      });
    }

    // Apply search term filter
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter((consulting) =>
        consulting.title.toLowerCase().includes(searchLower),
      );
    }

    return filtered;
  }

  /**
   * Returns paginated consultations from the filtered list.
   *
   * @returns {ConsultingSummary[] | undefined} Paginated list of consultations
   */
  get paginatedConsultings(): ConsultingSummary[] | undefined {
    if (!this.filteredConsultings) {
      return undefined;
    }

    const start = this.currentPage * this.rowsPerPage;
    const end = start + this.rowsPerPage;
    return this.filteredConsultings.slice(start, end);
  }

  /**
   * Returns the total count of all consultations.
   */
  get totalCount(): number {
    return this.consultings?.length || 0;
  }

  /**
   * Returns the count of active consultations.
   */
  get activeCount(): number {
    return (
      this.consultings?.filter((c) => Number(c.statusCons) === 0).length || 0
    );
  }

  /**
   * Returns the count of finished consultations.
   */
  get finishedCount(): number {
    return (
      this.consultings?.filter((c) => Number(c.statusCons) === 1).length || 0
    );
  }

  /**
   * Checks if the current page is the last page of consultations.
   * Used to display the "Create New" card only on the last page.
   */
  get isLastPage(): boolean {
    if (!this.filteredConsultings || this.filteredConsultings.length === 0) {
      return false;
    }
    const totalPages = Math.ceil(
      this.filteredConsultings.length / this.rowsPerPage,
    );
    return this.currentPage === totalPages - 1;
  }

  /**
   * Changes the active filter and updates the displayed consultations.
   * Resets pagination to first page when filter changes.
   *
   * @param {('all' | 'active' | 'finished')} filter - The filter to apply
   */
  setFilter(filter: 'all' | 'active' | 'finished'): void {
    this.currentFilter = filter;
    this.currentPage = 0;
  }

  /**
   * Handles pagination page change event.
   *
   * @param event - PrimeNG paginator event containing page information
   */
  onPageChange(event: any): void {
    this.currentPage = event.page;
  }

  /**
   * Checks if a specific filter is currently active.
   * Used to apply active styling to filter buttons.
   *
   * @param {('all' | 'active' | 'finished')} filter - The filter to check
   * @returns {boolean} True if the filter is currently active
   */
  isFilterActive(filter: 'all' | 'active' | 'finished'): boolean {
    return this.currentFilter === filter;
  }

  /**
   * Opens the delete dialog to confirm deletion of a consulting session.
   * Stores the consulting ID and title for the confirmation dialog.
   *
   * @param {number} id - The ID of the consulting session to delete
   * @param {Event} event - DOM event to prevent row click propagation
   */
  deleteConsulting(id: number, event: Event): void {
    event.stopPropagation();

    // Find the consulting to get its title
    const consulting = this.consultings?.find((c) => c.id === id);
    this.deletingConsultingId = id;
    this.deletingConsultingTitle =
      consulting?.title || 'Consultoría sin título';
    this.showDeleteDialog = true;
  }

  /**
   * Confirms and executes the deletion of the consulting session.
   * Called when user clicks "Eliminar" button in the delete dialog.
   */
  async confirmDelete(): Promise<void> {
    if (!this.deletingConsultingId) {
      return;
    }

    this.isDeletingConsulting = true;

    try {
      // Call service to delete consulting
      await firstValueFrom(
        this.consultingService.deleteConsulting(this.deletingConsultingId),
      );

      // Remove from local array
      if (this.consultings) {
        this.consultings = this.consultings.filter(
          (c) => c.id !== this.deletingConsultingId,
        );
      }

      // Show success message
      this.messageService.add({
        severity: 'success',
        summary: 'Eliminado',
        detail: 'La consultoría ha sido eliminada exitosamente',
        life: 3000,
      });

      this.showDeleteDialog = false;
    } catch (error) {
      console.error('Error deleting consulting:', error);

      // Show error message
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Ocurrió un error inesperado al eliminar la consultoría';

      this.errorService.showError(errorMessage);
    } finally {
      this.isDeletingConsulting = false;
      this.resetDeleteModalState();
    }
  }

  /**
   * Cancels the delete operation and closes the dialog.
   */
  cancelDelete(): void {
    this.showDeleteDialog = false;
    this.resetDeleteModalState();
  }

  /**
   * Resets the delete modal state after closing.
   */
  private resetDeleteModalState(): void {
    this.deletingConsultingId = undefined;
    this.deletingConsultingTitle = '';
  }

  /**
   * Handles skipping the title input and navigating directly to create consultation.
   * Called when user clicks "Omitir" button in the title dialog.
   */
  skipTitle() {
    this.showTitleDialog = false;
    this.consultationTitle = '';
    this.resetModalState();
    // Navigate to create new consultation without title
    this.router.navigate(['/consultations']);
  }

  /**
   * Handles submitting the optional title and navigating to create consultation.
   * Called when user clicks "Continuar" button with or without a title.
   * If a title is provided, it's stored and will be sent to the backend.
   */
  async submitTitle() {
    this.isSubmittingTitle = true;

    try {
      const titleToPass = this.consultationTitle.trim() || undefined;

      this.showTitleDialog = false;

      // Navigate to consultation page with title as state
      this.router.navigate(['/consultations'], {
        state: { title: titleToPass },
      });
    } finally {
      this.isSubmittingTitle = false;
      this.consultationTitle = '';
      this.resetModalState();
    }
  }

  /**
   * Handles updating the title of an existing consulting.
   * Calls the backend API to update the title and refreshes the local list.
   */
  async updateTitle() {
    if (!this.editingConsultingId) {
      console.error('No consulting ID to update');
      return;
    }

    const newTitle = this.consultationTitle.trim();

    this.isSubmittingTitle = true;

    try {
      // Call service to update title
      await firstValueFrom(
        this.consultingService.setTitle(this.editingConsultingId, newTitle),
      );

      // Update the local consulting list
      if (this.consultings) {
        const consulting = this.consultings.find(
          (c) => c.id === this.editingConsultingId,
        );
        if (consulting) {
          consulting.title = newTitle;
        }
      }

      this.showTitleDialog = false;
    } catch (error) {
      console.error('Error updating consulting title:', error);

      if (error instanceof Error) {
        this.errorService.showError(
          `Error al actualizar el nombre: ${error.message}`,
        );
      } else {
        this.errorService.showError(
          'Ocurrió un error inesperado al actualizar el nombre',
        );
      }
    } finally {
      this.isSubmittingTitle = false;
      this.consultationTitle = '';
      this.resetModalState();
    }
  }

  /**
   * Handles the single button action in the title dialog.
   * If in editing mode, updates the title. Otherwise, creates or skips.
   */
  async handleSubmit() {
    if (this.isEditingMode) {
      // If no text entered in edit mode, it means user wants to cancel
      if (!this.consultationTitle.trim()) {
        this.handleCancel();
      } else {
        await this.updateTitle();
      }
    } else if (this.consultationTitle.trim()) {
      await this.submitTitle();
    } else {
      this.skipTitle();
    }
  }

  /**
   * Resets the modal state after closing.
   */
  private resetModalState() {
    this.isEditingMode = false;
    this.editingConsultingId = undefined;
    this.currentEditingTitle = '';
  }

  /**
   * Returns the label for the action button based on mode and input.
   * @returns Button label text
   */
  getButtonLabel(): string {
    if (this.isEditingMode) {
      return this.consultationTitle.trim() ? 'Actualizar' : 'Cancelar';
    }
    return this.consultationTitle.trim() ? 'Continuar' : 'Omitir';
  }

  /**
   * Returns the icon for the action button based on mode and input.
   * @returns Icon class name
   */
  getButtonIcon(): string {
    if (this.isEditingMode) {
      return this.consultationTitle.trim() ? 'pi pi-check' : 'pi pi-times';
    }
    return this.consultationTitle.trim() ? 'pi pi-arrow-right' : 'pi pi-times';
  }

  /**
   * Returns the dialog title based on the mode.
   * @returns Dialog title text
   */
  getDialogTitle(): string {
    return this.isEditingMode ? 'Editar Consultoría' : 'Nueva Consultoría';
  }

  /**
   * Returns the dialog description based on the mode.
   * @returns Dialog description text
   */
  getDialogDescription(): string {
    if (this.isEditingMode) {
      return 'Ingresa el nuevo nombre para tu consultoría.';
    }
    return 'Puedes asignar un título descriptivo a tu consultoría o dejarlo en blanco para generarlo automáticamente.';
  }

  /**
   * Returns the input placeholder based on the mode.
   * @returns Placeholder text
   */
  getInputPlaceholder(): string {
    if (this.isEditingMode) {
      return this.currentEditingTitle;
    }
    return 'Ej: Mejora de ventas 2026';
  }

  /**
   * Handles canceling the edit or skip action.
   */
  handleCancel() {
    this.showTitleDialog = false;
    this.consultationTitle = '';
    this.resetModalState();
  }

  @ViewChild('userMenu') userMenu!: Menu;

  userMenuItems = [
    {
      label: 'Mi Perfil',
      icon: 'pi pi-user',
      command: () => {
        this.router.navigate(['/profile']);
      },
    },
    { separator: true },
    {
      label: 'Cerrar Sesión',
      icon: 'pi pi-sign-out',
      command: () => this.logout(),
    },
  ];

  /**
   * Returns the button configuration for the title dialog.
   * Dynamically adjusts based on editing mode and input state.
   */
  get titleDialogButtons(): DialogButton[] {
    return [
      {
        label: this.getButtonLabel(),
        icon: this.getButtonIcon(),
        styleClass: 'btn-primary',
        loading: this.isSubmittingTitle,
        callback: () => this.handleSubmit(),
      },
    ];
  }

  /**
   * Returns the button configuration for the delete confirmation dialog.
   */
  get deleteDialogButtons(): DialogButton[] {
    return [
      {
        label: 'Cancelar',
        icon: 'pi pi-times',
        styleClass: 'p-button-secondary p-button-outlined',
        disabled: this.isDeletingConsulting,
        callback: () => this.cancelDelete(),
      },
      {
        label: 'Eliminar',
        icon: 'pi pi-trash',
        styleClass: 'p-button-danger',
        loading: this.isDeletingConsulting,
        callback: () => this.confirmDelete(),
      },
    ];
  }

  /**
   * Returns the description for the delete confirmation dialog.
   * Includes the consulting title in HTML format.
   */
  get deleteDialogDescription(): string {
    return `¿Está seguro de que desea eliminar la consultoría <strong>"${this.deletingConsultingTitle}"</strong>?`;
  }
}
