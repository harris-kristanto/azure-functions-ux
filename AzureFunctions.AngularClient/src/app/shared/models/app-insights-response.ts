export interface AppInsightsResponse {
  Tables: AppInsightsResultTable[];
}

export interface AppInsightsResultTable {
  TableName: string;
  Columns: AppInsightsResultColumn[];
  Rows: any[][];
}

export interface AppInsightsResultColumn {
  ColumnName: string;
  DataType: string;
  ColumnType: string;
}
