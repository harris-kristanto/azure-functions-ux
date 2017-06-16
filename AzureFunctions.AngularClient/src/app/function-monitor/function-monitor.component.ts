import { Component, Input, OnChanges, SimpleChange, OnDestroy } from '@angular/core';
import { Subscription as RxSubscription } from 'rxjs/Subscription';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import {TranslateService, TranslatePipe} from '@ngx-translate/core';

import {FunctionInfo} from '../shared/models/function-info';
import {FunctionMonitorService} from '../shared/services/function-monitor.service';
import {FunctionInvocations} from '../shared/models/function-monitor';

import {GlobalStateService} from '../shared/services/global-state.service';
import {PortalService} from '../shared/services/portal.service';
import {PortalResources} from '../shared/models/portal-resources';

declare let moment: any;

@Component({
    selector: 'function-monitor',
    templateUrl: './function-monitor.component.html',
    styleUrls: ['./function-monitor.component.css']
})
export class FunctionMonitorComponent {
    @Input() public selectedFunction: FunctionInfo;

    constructor(
        private _portalService: PortalService,
        private _globalStateService: GlobalStateService,
        private _translateService: TranslateService) { }

}
