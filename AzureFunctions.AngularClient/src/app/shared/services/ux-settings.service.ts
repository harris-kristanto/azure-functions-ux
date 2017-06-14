import { Constants } from './../models/constants';
import { ArmObj } from './../models/arm/arm-obj';
import { CacheService } from './cache.service';
import { AppInsightsResponse } from './../models/app-insights-response';
import { Observable } from 'rxjs/Observable';
import { UxSettings, Query } from './../models/ux-settings';
import { UserService } from './user.service';
import { Http, Headers } from '@angular/http';
import { Injectable } from '@angular/core';

@Injectable()
export class UxSettingsService {
    private token: string;
    private readonly _appInsightsHost = 'https://api.applicationinsights.io';

    constructor(
        private _http: Http,
        private _cacheService: CacheService,
        private _userService: UserService) {
        this._userService.getStartupInfo()
            .subscribe(info => {
                this.token = info.token;
            });
    }

    getGraphs(armId: string, functionName?: string): Observable<Query[]> {
        return this._http.get(`/api/uxsettings/${armId}`, { headers: this.getPortalHeaders() })
            .map(r => <UxSettings> r.json())
            .map(r => r.graphs);
    }

    getQueryData(aiConfig: {apiKey: string, appId: string}, query: Query): Observable<AppInsightsResponse> {
        return this._http.get(`${this._appInsightsHost}/beta/apps/${aiConfig.appId}/query?query=${encodeURIComponent(query.value)}`, { headers: new Headers({'x-api-key': aiConfig.apiKey})})
            .map(v => <AppInsightsResponse> v.json());
    }

    getAppInsightsConfig(armId: string): Observable<{ apiKey: string, appId: string }> {
        return this._cacheService.postArm(`${armId}/config/appsettings/list`)
        .map(r => {
            const appSettingsArm: ArmObj<any> = r.json();
            return {
                apiKey: appSettingsArm.properties[Constants.appInsightsApiKey],
                appId: appSettingsArm.properties[Constants.appInsightsAppId]
            };
        });
    }

    private getPortalHeaders(): Headers {
        const contentType = 'application/json';
        const headers = new Headers();

        headers.append('Content-Type', contentType);
        headers.append('Accept', 'application/json,*/*');

        if (this.token) {
            headers.append('client-token', this.token);
            headers.append('portal-token', this.token);
        }

        return headers;
    }
}
