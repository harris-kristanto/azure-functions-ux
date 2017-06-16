import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Query } from './../shared/models/ux-settings';
import { AppInsightsResponse } from './../shared/models/app-insights-response';
import { Observable } from 'rxjs/Observable';
import { UxSettingsService } from './../shared/services/ux-settings.service';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/observable/combineLatest';
import { ArmObj } from './../shared/models/arm/arm-obj';
import { Component, OnInit, Input } from '@angular/core';

interface Graph {
  data?: Observable<AppInsightsResponse>;
  query: Query;
}

@Component({
  selector: 'app-insights-graphs',
  templateUrl: './app-insights-graphs.component.html',
  styleUrls: ['./app-insights-graphs.component.scss']
})
export class AppInsightsGraphsComponent {
  public graphs: Graph[];
  public editingGraph: Graph;
  public newContent: string;

  private armIdStream: Subject<string>;
  private functionNameStream: BehaviorSubject<string>;
  private appInsightsConfig: { apiKey: string, appId: string };
  private currentArmId: string;
  private currentFunctionName: string;

  constructor(private _uxSettingsService: UxSettingsService) {
    this.armIdStream = new Subject<string>();
    this.functionNameStream = new BehaviorSubject<string>(null);

    Observable.combineLatest(this.armIdStream, this.functionNameStream, (x, y, z) => ({ armId: x, functionName: y }))
      .debounceTime(50)
      .do(data => {
        this.currentArmId = data.armId;
        this.currentFunctionName = data.functionName;
        this.appInsightsConfig = null;
      })
      .switchMap(data => Observable.zip(
          _uxSettingsService.getAppInsightsConfig(data.armId),
          _uxSettingsService.getQueries(data.armId, data.functionName))
      )
      .do(null, () => {
        // log error
      })
      .retry()
      .subscribe(result => {
        const appInsightsConfig = result[0];
        const queries = result[1];
        this.appInsightsConfig = appInsightsConfig;
        this.graphs = queries.map(q => ({ data: this._uxSettingsService.getQueryData(appInsightsConfig, q), query: q }));
      });
  }

  @Input() set armId(value: string) {
    if (value) {
      this.armIdStream.next(value);
    }
  }

  @Input() set functionName(value: string) {
    if (value) {
      this.functionNameStream.next(value);
    }
  }

  onAddGraphClick() {
    this.editingGraph = {
      query: {
        value: ''
      }
    };
    this.newContent = null;
  }

  hideModal() {
    if (this.newContent == null || this.editingGraph.query.value === this.newContent || confirm('Your stuff will be lost?')) {
      this.newContent = null;
      this.editingGraph = null;
    }
  }

  createOrUpdateGraph() {
    if (this.editingGraph.query.value !== this.newContent) {
        this.editingGraph.query.value = this.newContent;
        this._uxSettingsService.addOrUpdateQuery(this.currentArmId, this.editingGraph.query, this.currentFunctionName)
          .subscribe(q => {
            const existingQuery = this.graphs.find(g => g.query.id === q.id);
            if (existingQuery) {
              existingQuery.query = q;
              existingQuery.data = this._uxSettingsService.getQueryData(this.appInsightsConfig, q);
            } else {
              this.graphs.push({ query: q, data: this._uxSettingsService.getQueryData(this.appInsightsConfig, q) });
            }
          });
    }
    this.hideModal();
  }

  deleteGraph(graph: Graph) {
    if (confirm('Are you sure you want to delete the chart?')) {
      this._uxSettingsService.deleteQuery(this.currentArmId, graph.query, this.currentFunctionName)
        .subscribe(() => {
          const index = this.graphs.findIndex((g) => g.query.id === graph.query.id);
          if (index > -1) {
            this.graphs.splice(index, 1);
          }
        });
    }
  }

  editGraph(graph: Graph) {
    // TODO: Fix
    const clone: Query = JSON.parse(JSON.stringify(graph.query));
    this.editingGraph = {
      query: clone
    };
    this.runQuery(clone.value);
  }


  runQuery(value: string) {
    this.editingGraph.data = this._uxSettingsService.getQueryData(this.appInsightsConfig, { value: value });
  }
}
