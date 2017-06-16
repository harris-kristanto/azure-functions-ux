import { ConfigService } from './../services/config.service';
import { Directive, EventEmitter, ElementRef, Input, Output } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/operator/distinctUntilChanged';

import { GlobalStateService } from '../services/global-state.service';
import {FunctionApp} from '../function-app';

declare var monaco;
declare var require;

@Directive({
    selector: '[monacoEditor]',
})
export class MonacoEditorDirective {
    @Output() public onContentChanged: EventEmitter<string>;
    @Output() public onSave: EventEmitter<string>;
    @Output() public onShiftEnter: EventEmitter<string>;

    private _language: string;
    private _content: string;
    private _disabled: boolean;
    private _editor: any;
    private _silent: boolean = false;
    private _fileName: string;
    private _functionAppStream : Subject<FunctionApp>;
    private _functionApp : FunctionApp;

    constructor(public elementRef: ElementRef,
        private _globalStateService: GlobalStateService,
        private _configService : ConfigService
        ) {

        this.onContentChanged = new EventEmitter<string>();
        this.onSave = new EventEmitter<string>();
        this.onShiftEnter = new EventEmitter<string>();

        this._functionAppStream = new Subject<FunctionApp>();
        this._functionAppStream
            .distinctUntilChanged()
            .subscribe(functionApp =>{
                this._functionApp = functionApp;
                this.init();
            });
    }

    @Input('functionAppInput') set functionAppInput(functionApp: FunctionApp){
        this._functionAppStream.next(functionApp);
    }

    @Input('content') set content(str: string) {
        if (!str) {
            str = '';
        }

        if (this._editor && this._editor.getValue() === str) {
            return;
        }
        this._content = str;
        if (this._editor) {
            this._silent = true;
            this._editor.setValue(this._content);
            this._silent = false;
        }
    }

    @Input('disabled') set disabled(value: boolean) {
        if (value !== this._disabled) {
            this._disabled = value;
            if (this._editor) {
                this._editor.updateOptions({
                    readOnly: this._disabled
                });
            }
        }
    }

    @Input('fileName') set fileName(filename: string) {
        let extension = filename.split('.').pop().toLocaleLowerCase();
        this._fileName = filename;

        switch (extension) {

            case 'bat':
                this._language = 'bat';
                break;
            case 'csx':
                this._language = 'csharp';
                break;
            case 'fsx':
                this._language = 'fsharp';
                break;
            case 'js':
                this._language = 'javascript';
                break;
            case 'json':
                this._language = 'json';
                break;
            case 'ps1':
                this._language = 'powershell';
                break;
            case 'py':
                this._language = 'python';
                break;
            case 'ts':
                this._language = 'typescript';
                break;
            // Monaco does not have sh, php
            case 'kusto':
                this._language = 'Kusto';
                break;
            default:
                this._language = undefined;
                break;
        }

        //if (this._editor) {
            this.init();
            // This does not work for JSON
            // monaco.editor.setModelLanguage(this._editor.getModel(), this._language);
     //   }
    }

    private registerKustoLanguage() {
        let language = {
                    name: 'kusto',
                    mimeTypes: ['text/kusto'],
                    displayName: "Kusto",
                    defaultToken: "invalid",
                    brackets: [ ['[',']','delimiter.square'],
                                ['(',')','delimiter.parenthesis'] ],
                    wordDefinition: /(-?\d*\.\d\w*)|([^\`\~\!\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
                    // promotedOperatorCommandTokens: (<any>window).Kusto.Data.IntelliSense.CslCommandParser.promotedOperatorCommandTokens,
                    // operatorCommandTokens: (<any>window).Kusto.Data.IntelliSense.CslCommandParser.operatorCommandTokens,
                    keywords: [
                        'by', 'on', 'contains', 'notcontains', 'containscs', 'notcontainscs', 'startswith', 'has', 'matches', 'regex', 'true',
                        'false', 'and', 'or', 'typeof', 'int', 'string', 'date', 'datetime', 'time', 'long', 'real', '​boolean', 'bool',
                        'where', 'summarize', 'project', 'extend', 'render'
                    ],
                    operators: ['+', '-', '*', '/', '>', '<', '==', '<>', '<=', '>=', '~', '!~'],
                    builtinFunctions: [
                        'countof', 'bin', 'extentid', 'extract', 'extractjson', 'floor', 'iif', 'isnull', 'isnotnull', 'notnull', 'isempty',
                        'isnotempty', 'notempty', 'now', 're2', 'strcat', 'strlen', 'toupper',
                        'tostring', 'count', 'cnt', 'sum', 'min', 'max', 'avg'],
                    tokenizer: {
                        root: [
                            { include: '@whitespace' },
                            { include: '@numbers' },
                            { include: '@strings' },
                            { include: '@dqstrings' },
                            { include: '@literals' },
                            { include: '@comments' },
                            [/[;,.]/, 'delimiter'],
                            [/[()\[\]]/, '@brackets'],
                            [/[<>=!%&+\-*/|~^]/, 'operator'],
                            [/[\w@#\-$]+/, {
                                cases: {
                                    '@keywords': 'keyword',
                                    // '@promotedOperatorCommandTokens': 'keyword',
                                    // '@operatorCommandTokens': 'keyword',
                                    '@operators': 'operator',
                                    '@builtinFunctions': 'predefined',
                                    '@default': 'identifier',
                                }
                            }],
                        ],
                        whitespace: [[/\s+/, 'white']],
                        comments: [["\\/\\/+.*", "comment"]],
                        numbers: [
                            [/0[xX][0-9a-fA-F]*/, 'number'],
                            [/[$][+-]*\d*(\.\d*)?/, 'number'],
                            [/((\d+(\.\d*)?)|(\.\d+))([eE][\-+]?\d+)?/, 'number']
                        ],
                        strings: [
                            [/H'/, { token: 'string.quote', bracket: '@open', next: '@string' }],
                            [/h'/, { token: 'string.quote', bracket: '@open', next: '@string' }],
                            [/'/, { token: 'string.quote', bracket: '@open', next: '@string' }]
                        ],
                        string: [
                            [/[^']+/, 'string'],
                            [/''/, 'string'],
                            [/'/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
                        ],
                        dqstrings: [
                            [/H"/, { token: 'string.quote', bracket: '@open', next: '@dqstring' }],
                            [/h"/, { token: 'string.quote', bracket: '@open', next: '@dqstring' }],
                            [/"/, { token: 'string.quote', bracket: '@open', next: '@dqstring' }]
                        ],
                        dqstring: [
                            [/[^"]+/, 'string'],
                            [/""/, 'string'],
                            [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
                        ],

                        literals: [[/datetime\(\d{4}-\d{2}-\d{2}(\s+\d{2}:\d{2}(:\d{2}(\.\d{0,3})?)?)?\)/, 'number'],
                            [/time\((\d+(s(ec(onds?)?)?|m(in(utes?)?)?|h(ours?)?|d(ays?)?)|(\s*(('[^']+')|("[^"]+"))\s*))\)/, 'number'],
                            [/guid\([\da-fA-F]{8}-[\da-fA-F]{4}-[\da-fA-F]{4}-[\da-fA-F]{4}-[\da-fA-F]{12}\)/, 'number'],
                            [/typeof\((int|string|date|datetime|time|long|real|boolean|bool)\)/, 'number']]
                    }
                };
                monaco.languages.register({ id: 'Kusto' });
                monaco.languages.setMonarchTokensProvider('Kusto', language);
                // monaco.languages.registerCompletionItemProvider('Kusto', {
                //     triggerCharacters: [' '],
                //     provideCompletionItems: function (model, position) {
                //         var word = model.getWordUntilPosition(position);
                //         var commandText = getCommandText(model, position);

                //         return $laKustoIntelliSense.suggest(commandText);
                //     }
                // });
    }

    public setLayout(width?: number, height?: number) {
        if (this._editor) {
            let layout = this._editor.getLayoutInfo();
            this._editor.layout({
                width: width ? width : layout.width,
                height: height ? height : layout.height,
            });
        }
    }


    private init() {
        this._globalStateService.setBusyState();

        let onGotAmdLoader = () => {
            (<any>window).require.config({ paths: { 'vs': 'assets/monaco/min/vs' } });
            (<any>window).require(['vs/editor/editor.main'], () => {
                let that = this;
                if (that._editor) {
                    that._editor.dispose();
                }

                const projectJson = 'project.json';
                const functionJson = 'function.json';
                const hostJson = 'host.json';
                let fileName = that._fileName || '';
                fileName = fileName.toLocaleLowerCase();
                if ((fileName === projectJson || fileName === functionJson || fileName === hostJson) && that._functionApp) {
                        that.setMonacoSchema(fileName, that._functionApp);
                } else {
                    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
                        schemas: []
                    });
                }

                // compiler options
                monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
                    target: monaco.languages.typescript.ScriptTarget.ES2015,
                });

                if (this._language === 'Kusto') {
                    this.registerKustoLanguage();
                }

                that._editor = monaco.editor.create(that.elementRef.nativeElement, {
                    value: that._content,
                    language: that._language,
                    readOnly: that._disabled,
                    lineHeight: 17
                });

                that._editor.onDidChangeModelContent(() => {
                    if (!that._silent) {
                        that.onContentChanged.emit(that._editor.getValue());
                    }
                });

                // TODO: test with MAC
                that._editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, () => {
                    that.onSave.emit(that._editor.getValue());
                });

                that._editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
                    that.onShiftEnter.emit(that._editor.getValue());
                });

                that._globalStateService.clearBusyState();

            });
        };

        // Load AMD loader if necessary
        if (!(<any>window).require) {
            let loaderScript = document.createElement('script');
            loaderScript.type = 'text/javascript';
            loaderScript.src = 'assets/monaco/vs/loader.js';
            loaderScript.addEventListener('load', onGotAmdLoader);
            document.body.appendChild(loaderScript);
        } else {
            onGotAmdLoader();
        }
    }

    setMonacoSchema(schemaName: string, functionApp: FunctionApp) {
        functionApp.getJson('assets/schemas/' + schemaName)
            .subscribe((schema) => {
                schema.additionalProperties = false;
                monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
                    validate: true,
                    schemas: [{
                        fileMatch: ['*'],
                        schema: schema
                    }]
                });
            });
    }
}
