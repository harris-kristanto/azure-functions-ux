import { BusyStateComponent } from './../busy-state/busy-state.component';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { AppInsightsResponse, AppInsightsResultTable } from './../shared/models/app-insights-response';
import { Component, OnInit, Input, ElementRef, ViewChild } from '@angular/core';
declare let d3: any;

@Component({
  selector: 'graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.scss']
})
export class GraphComponent {
  public _data: any[];
  public options: any;
  @ViewChild(BusyStateComponent) busyState: BusyStateComponent;
  @Input() full: boolean;

  private stream: Subject<Observable<AppInsightsResponse>>;

  constructor() {
    this.stream = new Subject<Observable<AppInsightsResponse>>();
    this.stream
      .do(() => this.setBusyState())
      .switchMap(v => v)
      .do(() => this.clearBusyState(), () => this.clearBusyState())
      .retry()
      .subscribe(value => {
        const table = value && value.Tables.find(t => t.TableName === 'Table_0');
        if (table && table.Rows.length > 0 && table.Columns.length > 0) {
          const graphType = this.getGraphType(value);
          switch (graphType) {
            case 'timechart':
              this.handleTimeChart(table);
              break;
            case 'piechart':
              this.handlePieChart(table);
              break;
            case 'barchart':
              this.handleBarChart(table);
              break;
            case 'areachart':
              this.handleAreaChart(table);
              break;
            case 'scatterchart':
              this.handleScatterChart(table);
              break;
          }
        } else if (table && table.Rows.length === 0) {
          this._data = [];
          this.options = {
            chart: {
              type: 'lineChart',
              height: 355,
              margin : {
                top: 20,
                right: 20,
                bottom: 50,
                left: 55
              },
              x: (d) => d.x,
              y: (d) =>  d.y,
              clipEdge: true,
              showValues: true,
              useInteractiveGuideline: false,
              showLegend: true,
              showYAxis: true,
              showXAxis: true,
              xAxis: {
                showMaxMin: false,
                axisLabel: 'Date',
                tickFormat: d => d3.time.format('%H:%M')(new Date(d))
              },
              yAxis: {
                axisLabel: 'Y Axis',
                axisLabelDistance: -10,
                tickFormat: d => d3.format('.2s')(d)
              }
              }
            };
        }
      });
    this._data = [];
  }

  @Input() set dataObservable(value: Observable<AppInsightsResponse>) {
    this.stream.next(value);
  }

  setBusyState() {
    if (this.busyState) {
      this.busyState.setBusyState();
    }
  }

  clearBusyState() {
    if (this.busyState) {
      this.busyState.clearBusyState();
    }
  }

  private getGraphType(data: AppInsightsResponse): 'piechart' | 'timechart' | 'barchart' | 'areachart' | 'scatterchart' {
    const table = data.Tables.find(t => t.TableName === 'Table_1');
    if (table && table.Columns.length > 0 && table.Rows.length > 0) {
      const stringValue = table.Rows[0][0];
      try {
        let rowValue = JSON.parse(stringValue);
        const chartTypes = ['piechart', 'timechart', 'barchart', 'areachart', 'scatterchart'];
        if (rowValue.Visualization && chartTypes.find(t => t === rowValue.Visualization.toLowerCase())) {
          return rowValue.Visualization;
        }
      } catch (e) {}
      return null;
    }
  }

  private handleTimeChart(table: AppInsightsResultTable) {
    const timestampIndex = table.Columns.findIndex(i => i.ColumnType === 'datetime');
    const stringIndex = table.Columns.findIndex(i => i.ColumnType === 'string');
    const dataRows = [];
    if (stringIndex === -1) {
      const names = table.Columns.map(i => i.ColumnName);
      for (let i = 0; i < names.length; i++) {
        if (i === timestampIndex) {
          continue;
        }
        dataRows.push({
          values: table.Rows.map(r => ({ x: new Date(r[timestampIndex]), y: r[i] })).sort((a, b) => (b.x.getTime() - a.x.getTime())),
          key: names[i],
          strokeWidth: 2
        });
      }
    } else {
      const numberIndex = table.Columns.findIndex(i => i.ColumnType === 'long' || i.ColumnType === 'real');
      const series = Array.from(new Set(table.Rows.map(r => r[stringIndex])));
      for (let i = 0; i < series.length; i++) {
        dataRows.push({
          values: table.Rows.filter(r => r[stringIndex] === series[i]).map(r => ({ x: new Date(r[timestampIndex]), y: r[numberIndex] })).sort((a, b) => (b.x.getTime() - a.x.getTime())),
          key: series[i],
          strokeWidth: 2
        });
      }
    }

    this._data = dataRows;

    this.options = {
      chart: {
        type: 'lineChart',
        height: 355,
        // width: 535,
        margin : {
          top: 20,
          right: 20,
          bottom: 50,
          left: 55
        },
        x: (d) => d.x,
        y: (d) =>  d.y,
        clipEdge: true,
        showValues: true,
        useInteractiveGuideline: false,
        showLegend: true,
        showYAxis: true,
        showXAxis: true,
        xAxis: {
          showMaxMin: false,
          axisLabel: 'Date',
          tickFormat: d => d3.time.format('%H:%M')(new Date(d))
        },
        yAxis: {
          axisLabel: 'Y Axis',
          axisLabelDistance: -10,
          tickFormat: d => d3.format('.2s')(d)
        }
      }
    };
  }

  private handlePieChart(table: AppInsightsResultTable) {
    const stringIndex = table.Columns.findIndex(i => i.ColumnType === 'string');
    const numberIndex = table.Columns.findIndex(i => i.ColumnType === 'long' || i.ColumnType === 'real');
    const dataRows = [];
    if (stringIndex !== -1 && numberIndex !== -1) {
      const series = Array.from(new Set(table.Rows.map(r => r[stringIndex])));
      for (let i = 0; i < series.length; i++) {
        dataRows.push(
          {x: series[i], y: table.Rows.filter(r => r[stringIndex] === series[i]).map(r => r[numberIndex]).reduce((a, b) => a + b, 0) },
        );
      }
    }

    this._data = dataRows;

    this.options = {
      chart: {
        type: 'pieChart',
        height: 355,
        // width: 535,
        margin : {
          top: 20,
          right: 20,
          bottom: 50,
          left: 55
        },
        x: (d) => d.x,
        y: (d) =>  d.y,
        useInteractiveGuideline: false,
        labelThreshold: .05,
        labelType: 'percent',
        donut: true,
        donutRatio: 0.35
     }
    };
  }

  private handleBarChart(table: AppInsightsResultTable) {

  }

  private handleAreaChart(table: AppInsightsResultTable) {
    const timestampIndex = table.Columns.findIndex(i => i.ColumnType === 'datetime');
    const stringIndex = table.Columns.findIndex(i => i.ColumnType === 'string');
    const dataRows = [];
    if (stringIndex === -1) {
      const names = table.Columns.map(i => i.ColumnName);
      for (let i = 0; i < names.length; i++) {
        if (i === timestampIndex) {
          continue;
        }
        dataRows.push({
          values: table.Rows.map(r => ({ x: new Date(r[timestampIndex]), y: r[i] })).sort((a, b) => (b.x.getTime() - a.x.getTime())),
          key: names[i],
          strokeWidth: 2
        });
      }
    } else {
      const numberIndex = table.Columns.findIndex(i => i.ColumnType === 'long' || i.ColumnType === 'real');
      const series = Array.from(new Set(table.Rows.map(r => r[stringIndex])));
      for (let i = 0; i < series.length; i++) {
        dataRows.push({
          values: table.Rows.filter(r => r[stringIndex] === series[i]).map(r => ({ x: new Date(r[timestampIndex]), y: r[numberIndex] })).sort((a, b) => (b.x.getTime() - a.x.getTime())),
          key: series[i],
          strokeWidth: 2
        });
      }
    }

    let smallest = Infinity;
    for (const item of dataRows) {
      if (item.values.length < smallest) {
        smallest = item.values.length;
      }
    }

    for (const item of dataRows) {
      item.values = item.values.slice(0, smallest);
    }

    this._data = dataRows;

    this.options = {
      chart: {
        type: 'stackedAreaChart',
        height: 355,
        // width: 535,
        margin : {
          top: 20,
          right: 20,
          bottom: 50,
          left: 55
        },
        x: (d) => d.x,
        y: (d) =>  d.y,
        clipEdge: true,
        showValues: true,
        useInteractiveGuideline: false,
        showLegend: true,
        showYAxis: true,
        showXAxis: true,
        xAxis: {
          showMaxMin: false,
          axisLabel: 'Date',
          tickFormat: d => d3.time.format('%H:%M')(new Date(d))
        },
        yAxis: {
          axisLabel: 'Y Axis',
          axisLabelDistance: -10,
          tickFormat: d => d3.format('.2s')(d)
        }
      }
    };
  }

  private handleScatterChart(table: AppInsightsResultTable) {

  }

  groupBy(xs, key) {
    return xs.reduce(function(rv, x) {
      (rv[x[key]] = rv[x[key]] || []).push(x);
      return rv;
    }, {});
  }
}
