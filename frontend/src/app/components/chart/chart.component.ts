import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { Chart, ChartConfiguration, ChartType, ChartOptions, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-chart',
  standalone: true,
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.scss']
})
export class ChartComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  @Input() chartId: string = 'defaultChart';
  @Input() chartType!: ChartType;
  @Input() chartData!: ChartConfiguration<any>['data'];
  @Input() chartOptions?: ChartOptions<any>;
  private chart!: Chart;

  ngOnInit(): void { }

  ngAfterViewInit(): void {
    if (this.chartData) {
      this.createChart();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Only update chart if it already exists
    if (this.chart) {
      let needsUpdate = false;

      if (changes['chartData'] && !changes['chartData'].firstChange) {
        // Update chart data in place for smooth animation
        this.updateChartData(this.chartData);
        needsUpdate = true;
      }

      if (changes['chartOptions'] && !changes['chartOptions'].firstChange) {
        this.chart.options = this.chartOptions ?? {};
        needsUpdate = true;
      }

      if (needsUpdate) {
        this.chart.update();
      }
    } else if (this.chartCanvas && this.chartData) {
      this.createChart();
    }
  }

  /**
   * Updates the chart's data in place for smooth transitions.
   * This avoids destroying and recreating the chart.
   */
  private updateChartData(newData: ChartConfiguration<any>['data']): void {
    if (!this.chart || !newData) return;

    // Update labels
    this.chart.data.labels = newData.labels;

    // Update datasets in place
    if (Array.isArray(newData.datasets)) {
      // If number of datasets changed, replace the array
      if (this.chart.data.datasets.length !== newData.datasets.length) {
        this.chart.data.datasets = newData.datasets.map(ds => ({ ...ds }));
      } else {
        // Update each dataset's data and properties
        this.chart.data.datasets.forEach((dataset, i) => {
          Object.assign(dataset, newData.datasets[i]);
        });
      }
    }
  }

  createChart(): void {
    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(this.chartCanvas.nativeElement, {
      type: this.chartType,
      data: this.chartData,
      options: this.chartOptions
    });
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }
}
