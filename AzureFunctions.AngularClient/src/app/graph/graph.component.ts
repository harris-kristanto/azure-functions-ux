import { AppInsightsResponse } from './../shared/models/app-insights-response';
import { Component, OnInit, Input, ElementRef } from '@angular/core';
declare let d3: any;

@Component({
  selector: 'graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.scss']
})
export class GraphComponent {
  public labels: string[];
  public _data: any[];
  public graphType: string;

  constructor() {
  }

  @Input() set data(value: AppInsightsResponse) {
    const table = value && value.Tables.find(t => t.TableName === 'Table_0');
    if (table && table.Rows.length > 0) {
      const datasetCount = table.Rows[0].length - 1;
      this.labels = table.Rows.map(a => a[0]);
      let dataRows = [];

      for (let i = 0; i < datasetCount; i++) {
        dataRows.push([]);
      }

      for (let i = 0; i < table.Rows.length; i++) {
        for (let j = 0; j < datasetCount; j++) {
          dataRows[j].push(table.Rows[i][j]);
        }
      }

      this._data = dataRows.map(a => ({data: a, label: Math.random().toString()}));
      this.graphType = 'line';
    } else {
      this.labels = [];
      this._data = [];
      this.graphType = '';
    }
  }

  options;
  data2;
  ngOnInit(){
    this.options = {
      chart: {
        type: 'discreteBarChart',
        height: 450,
        margin : {
          top: 20,
          right: 20,
          bottom: 50,
          left: 55
        },
        x: function(d){return d.label;},
        y: function(d){return d.value;},
        showValues: true,
        valueFormat: function(d){
          return d3.format(',.4f')(d);
        },
        duration: 500,
        xAxis: {
          axisLabel: 'X Axis'
        },
        yAxis: {
          axisLabel: 'Y Axis',
          axisLabelDistance: -10
        }
      }
    }
    this.data2 = [
      {
        key: "Cumulative Return",
        values: [
          {
            "label" : "A" ,
            "value" : -29.765957771107
          } ,
          {
            "label" : "B" ,
            "value" : 0
          } ,
          {
            "label" : "C" ,
            "value" : 32.807804682612
          } ,
          {
            "label" : "D" ,
            "value" : 196.45946739256
          } ,
          {
            "label" : "E" ,
            "value" : 0.19434030906893
          } ,
          {
            "label" : "F" ,
            "value" : -98.079782601442
          } ,
          {
            "label" : "G" ,
            "value" : -13.925743130903
          } ,
          {
            "label" : "H" ,
            "value" : -5.1387322875705
          }
        ]
      }
    ];
  }
}
