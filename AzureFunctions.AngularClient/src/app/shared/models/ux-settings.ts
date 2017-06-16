export interface UxSettings {
  graphs: Query[];
}

export interface Query {
  id?: string;
  value: string;
  createdTime?: string;
  modifiedTime?: string;
}
