import {
  Injector, Inject, ElementRef,
  OnInit, NgZone, Optional, forwardRef
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';


import { InputConverter } from '../decorators';
import { OntimizeService, AuthGuardService, OTranslateService, LocalStorageService } from '../services';
import { ILocalStorageComponent } from '../interfaces';
import { OFormComponent } from './form/o-form.component';
import { Util } from '../utils';

export const DEFAULT_INPUTS_O_SERVICE_COMPONENT = [
  // attr [string]: list identifier. It is mandatory if data are provided through the data attribute. Default: entity (if set).
  'oattr: attr',

  'title',

  'cssClass: css-class',

  // visible [no|yes]: visibility. Default: yes.
  'ovisible: visible',

  // enabled [no|yes]: editability. Default: yes.
  'oenabled: enabled',

  //controls [string][yes|no|true|false]:
  'controls',

  // service [string]: JEE service path. Default: no value.
  'service',

  // entity [string]: entity of the service. Default: no value.
  'entity',

  // query-method [string]: name of the service method to perform queries. Default: query.
  'queryMethod: query-method',

  // paginated-query-method [string]: name of the service method to perform paginated queries. Default: advancedQuery.
  'paginatedQueryMethod : paginated-query-method',

  // query-on-init [no|yes]: query on init. Default: yes.
  'queryOnInit: query-on-init',

  // query-on-init [no|yes]: query on bind. Default: yes.
  'queryOnBind: query-on-bind',

  'pageable',

  // columns [string]: columns of the entity, separated by ';'. Default: no value.
  'columns',

  // keys [string]: entity keys, separated by ';'. Default: no value.
  'keys',

  // parent-keys [string]: parent keys to filter, separated by ';'. Default: no value.
  'parentKeys: parent-keys',

  //static-data [Array<any>] : way to populate with static data. Default: no value.
  'staticData: static-data',

  // detail-mode [none|click|doubleclick]: way to open the detail form of a row. Default: 'none'.
  'detailMode: detail-mode',

  // detail-form-route [string]: route of detail form. Default: 'detail'.
  'detailFormRoute: detail-form-route',

  // recursive-detail [no|yes]: do not append detail keys when navigate (overwrite current). Default: no.
  'recursiveDetail: recursive-detail',

  // detail-button-in-row [no|yes]: adding a button in row for opening detail form. Default: yes.
  'detailButtonInRow: detail-button-in-row',

  // detail-button-in-row-icon [string]: material icon. Default: mode_edit.
  'detailButtonInRowIcon: detail-button-in-row-icon',

  // edit-form-route [string]: route of edit form. Default: 'edit'.
  'editFormRoute: edit-form-route',

  // recursive-edit [no|yes]: do not append detail keys when navigate (overwrite current). Default: no.
  'recursiveEdit: recursive-edit',

  // edit-button-in-row [no|yes]: adding a button in row for opening edition form. Default: no.
  'editButtonInRow: edit-button-in-row',

  // edit-button-in-row-icon [string]: material icon. Default: search.
  'editButtonInRowIcon: edit-button-in-row-icon',

  // query-rows [number]: number of rows per page. Default: 10.
  'queryRows: query-rows'
];

export class OServiceComponent implements ILocalStorageComponent {

  public static DEFAULT_INPUTS_O_SERVICE_COMPONENT = DEFAULT_INPUTS_O_SERVICE_COMPONENT;

  public static DEFAULT_QUERY_METHOD = 'query';
  public static DEFAULT_PAGINATED_QUERY_METHOD = 'advancedQuery';
  public static DEFAULT_QUERY_ROWS = 10;
  public static DEFAULT_DETAIL_ICON = 'chevron_right';
  public static DEFAULT_EDIT_ICON = 'mode_edit';

  public static DEFAULT_DETAIL_MODE = 'none';
  public static DETAIL_MODE_CLICK = 'click';
  public static DETAIL_MODE_DBLCLICK = 'dblclick';


  protected authGuardService: AuthGuardService;
  protected translateService: OTranslateService;
  protected localStorageService: LocalStorageService;

  /* inputs variables */
  protected oattr: string;
  protected title: string;
  protected cssclass: string;
  @InputConverter()
  protected ovisible: boolean = true;
  @InputConverter()
  protected oenabled: boolean = true;
  @InputConverter()
  protected controls: boolean = true;
  protected service: string;
  protected entity: string;
  protected queryMethod: string;
  protected paginatedQueryMethod: string;
  @InputConverter()
  protected queryOnInit: boolean = true;
  @InputConverter()
  protected queryOnBind: boolean = true;
  @InputConverter()
  protected pageable: boolean = false;
  protected columns: string;
  protected keys: string;
  protected parentKeys: string;
  protected staticData: Array<any>;
  protected detailMode: string;
  protected detailFormRoute: string;
  @InputConverter()
  protected recursiveDetail: boolean = false;
  @InputConverter()
  public detailButtonInRow: boolean = true;
  protected detailButtonInRowIcon: string;
  protected editFormRoute: string;
  @InputConverter()
  protected recursiveEdit: boolean = false;
  @InputConverter()
  protected editButtonInRow: boolean = false;
  protected editButtonInRowIcon: string;
  protected queryRows: any;
  /* end of inputs variables */

  /*parsed inputs variables */
  protected colArray: Array<string> = [];
  protected keysArray: Array<string> = [];
  protected _pKeysEquiv = {};
  protected dataArray: Array<any> = [];
  protected parentItem: any;
  /* end of parsed inputs variables */

  protected onLanguageChangeSubscribe: any;
  protected onRouteChangeStorageSubscribe: any;
  protected onFormDataSubscribe: any;

  public loading: boolean = false;
  protected loaderSuscription: Subscription;
  protected querySuscription: Subscription;
  protected filterForm: boolean = false;
  protected dataService: any;
  protected state: any;

  protected router: Router;
  protected actRoute: ActivatedRoute;
  protected injector: Injector;
  protected elRef: ElementRef;
  protected form: OFormComponent;

  constructor(
    injector: Injector,
    elRef: ElementRef,
    @Optional() @Inject(forwardRef(() => OFormComponent)) form: OFormComponent
  ) {
    this.injector = injector;
    this.elRef = elRef;
    this.form = form;
    this.router = this.injector.get(Router);
    this.actRoute = this.injector.get(ActivatedRoute);

    this.detailMode = OServiceComponent.DEFAULT_DETAIL_MODE;

    if (this.injector) {
      this.authGuardService = this.injector.get(AuthGuardService);
      this.translateService = this.injector.get(OTranslateService);
      this.localStorageService = this.injector.get(LocalStorageService);
      let self = this;
      this.onLanguageChangeSubscribe = this.translateService.onLanguageChanged.subscribe(
        res => {
          self.onLanguageChangeCallback(res);
        }
      );
      this.onRouteChangeStorageSubscribe = this.localStorageService.onRouteChange.subscribe(
        res => {
          self.localStorageService.updateComponentStorage(self);
        }
      );

    }
  }

  getComponentKey(): string {
    return this.oattr;
  }

  getDataToStore(): Object {
    return this.state;
  }

  onLanguageChangeCallback(res: any) {
    console.log('onLanguageChangeCallback');
  }

  getKeys() {
    return this.keysArray;
  }

  initialize(): void {
    if (typeof (this.oattr) === 'undefined') {
      if (typeof (this.entity) !== 'undefined') {
        this.oattr = this.entity.replace('.', '_');
      }
    }

    if (typeof (this.title) !== 'undefined') {
      this.title = this.translateService.get(this.title);
    }

    this.authGuardService.getPermissions(this.router.url, this.oattr)
      .then(
      permissions => {
        if (typeof (permissions) !== 'undefined') {
          if (this.ovisible && permissions.visible === false) {
            this.ovisible = false;
          }
          if (this.oenabled && permissions.enabled === false) {
            this.oenabled = false;
          }
        }
      }
      );

    this.keysArray = Util.parseArray(this.keys);
    this.colArray = Util.parseArray(this.columns);
    let pkArray = Util.parseArray(this.parentKeys);
    this._pKeysEquiv = Util.parseParentKeysEquivalences(pkArray);

    //TODO: get default values from ICrudConstants
    if (!this.queryMethod) {
      this.queryMethod = OServiceComponent.DEFAULT_QUERY_METHOD;
    }

    if (!this.paginatedQueryMethod) {
      this.paginatedQueryMethod = OServiceComponent.DEFAULT_PAGINATED_QUERY_METHOD;
    }

    if (this.queryRows) {
      this.queryRows = parseInt(this.queryRows);
    } else {
      this.queryRows = OServiceComponent.DEFAULT_QUERY_ROWS;
    }

    if (!this.detailButtonInRowIcon) {
      this.detailButtonInRowIcon = OServiceComponent.DEFAULT_DETAIL_ICON;
    }

    if (!this.editButtonInRowIcon) {
      this.editButtonInRowIcon = OServiceComponent.DEFAULT_EDIT_ICON;
    }

    if (this.staticData) {
      this.queryOnBind = false;
      this.queryOnInit = false;
      this.setDataArray(this.staticData);
    } else {
      this.configureService();
    }

    if (this.form) {
      this.setFormComponent(this.form);
    }
  }

  destroy() {
    this.onLanguageChangeSubscribe.unsubscribe();
    if (this.onFormDataSubscribe) {
      this.onFormDataSubscribe.unsubscribe();
    }
  }

  configureService() {
    this.dataService = this.injector.get(OntimizeService);

    if (Util.isDataService(this.dataService)) {
      let serviceCfg = this.dataService.getDefaultServiceConfiguration(this.service);
      if (this.entity) {
        serviceCfg['entity'] = this.entity;
      }
      this.dataService.configureService(serviceCfg);
    }
  }

  setDataArray(data: any): void {
    if (Util.isArray(data)) {
      this.dataArray = data;
    } else if (Util.isObject(data)) {
      this.dataArray = [data];
    } else {
      console.warn('Component has received not supported service data. Supported data are Array or Object');
      this.dataArray = [];
    }
  }

  setFormComponent(form: OFormComponent) {
    var self = this;
    this.onFormDataSubscribe = this.form.onFormDataLoaded.subscribe(data => {
      self.parentItem = data;
      self.queryData();
    }
    );

    let dataValues = this.form.getDataValues();
    if (dataValues && Object.keys(dataValues).length > 0) {
      self.parentItem = dataValues;
      self.queryData();
    } else {
      this.filterForm = true;
    }
    // TODO PENDING QUERY ON BIND
    // var self = this;
    // this.form.onFormDataLoaded.subscribe(data => {
    // //  if (self.queryOnBind) {
    //     self.parentItem = data;
    //      self.update(data);
    //       // self.onFormDataBind(data);
    //     // }
    // });
  }

  queryData() {
    console.log('queryData');
  }

  reloadData() {
    console.log('reloadData');
  }

  load(): any {
    var self = this;
    var zone = this.injector.get(NgZone);
    var loadObservable = new Observable(observer => {
      var timer = window.setTimeout(() => {
        observer.next(true);
      }, 250);

      return () => {
        window.clearTimeout(timer);
        zone.run(() => {
          self.loading = false;
        });
      };

    });
    var subscription = loadObservable.subscribe(val => {
      zone.run(() => {
        self.loading = val as boolean;
      });
    });
    return subscription;
  }

  viewDetail(item: any): void {
    let route = this.getRouteOfSelectedRow(item, this.detailFormRoute);
    if (route.length > 0) {
      this.router.navigate(route,
        {
          relativeTo: this.recursiveDetail ? this.actRoute.parent : this.actRoute,
          queryParams: {
            'isdetail': 'true'
          }
        }
      );
    }
  }

  editDetail(item: any) {
    let route = this.getRouteOfSelectedRow(item, this.editFormRoute);
    if (route.length > 0) {
      route.push('edit');
      this.router.navigate(
        route,
        {
          relativeTo: this.recursiveEdit ? this.actRoute.parent : this.actRoute,
          queryParams: {
            'isdetail': 'true'
          }
        }
      );
    }
  }

  getRouteOfSelectedRow(item: any, modeRoute: any) {
    let route = [];
    // TODO: multiple keys
    let filter = undefined;
    if (typeof (item) === 'object') {
      for (let k = 0; k < this.keysArray.length; ++k) {
        let key = this.keysArray[k];
        filter = item[key];
      }
    }
    if (typeof (filter) !== 'undefined') {
      if (modeRoute) {
        route.push(modeRoute);
      }
      route.push(filter);
    }
    return route;
  }

  getQueryArguments(filter: Object, ovrrArgs?: any): Array<any> {
    let queryArguments = [filter, this.colArray, this.entity];
    if (this.pageable) {
      let queryOffset = (ovrrArgs && ovrrArgs.hasOwnProperty('offset')) ? ovrrArgs.offset : this.state.queryRecordOffset;
      let queryRowsN = (ovrrArgs && ovrrArgs.hasOwnProperty('length')) ? ovrrArgs.length : this.queryRows;
      queryArguments = queryArguments.concat([undefined, queryOffset, queryRowsN, undefined]);
    }
    return queryArguments;
  }

  updatePaginationInfo(queryRes: any) {
    let resultEndIndex = queryRes.startRecordIndex + queryRes.data.length;
    if (queryRes.startRecordIndex !== undefined) {
      this.state.queryRecordOffset = resultEndIndex;
    }
    if (queryRes.totalQueryRecordsNumber !== undefined) {
      this.state.queryTotalRecordNumber = queryRes.totalQueryRecordsNumber;
    }
  }
}
