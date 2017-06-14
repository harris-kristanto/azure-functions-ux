import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Query } from './../shared/models/ux-settings';
import { AppInsightsResponse } from './../shared/models/app-insights-response';
import { Observable } from 'rxjs/Observable';
import { UxSettingsService } from './../shared/services/ux-settings.service';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/observable/combineLatest';
import { ArmObj } from './../shared/models/arm/arm-obj';
import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-insights-graphs',
  templateUrl: './app-insights-graphs.component.html',
  styleUrls: ['./app-insights-graphs.component.scss']
})
export class AppInsightsGraphsComponent {
  public graphsData: Observable<AppInsightsResponse>[];

  private armIdStream: Subject<string>;
  private functionNameStream: Subject<string>;

  constructor(private _uxSettingsService: UxSettingsService) {
    this.armIdStream = new Subject<string>();
    this.functionNameStream = new BehaviorSubject<string>('');

    Observable.combineLatest(this.armIdStream, this.functionNameStream, (x, y) => ({ armId: x, functionName: y }))
      .switchMap(data => Observable.zip(
          _uxSettingsService.getAppInsightsConfig(data.armId),
          _uxSettingsService.getGraphs(data.armId, data.functionName))
      )
      .do(null, () => {
        // log error
      })
      .retry()
      .subscribe((result: [{ apiKey: string, appId: string }, Query[]]) => {
        const appInsightsConfig = result[0];
        const queries = result[1];
        this.graphsData = queries.map(q => this._uxSettingsService.getQueryData(appInsightsConfig, q));
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
}
