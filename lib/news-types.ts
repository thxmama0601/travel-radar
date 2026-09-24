export type NewsItem={id:string;title:string;url:string;publisher:string;publishedAt:string|null;regions:string[];category:string;sourceIds:string[];sourceKind:"direct"|"search"};
export type SourceStatus={id:string;name:string;status:"ok"|"stale"|"error"|"inactive";lastSuccessAt:string|null;latestPublishedAt:string|null;count:number;kind:"direct"|"search";url:string;note:string};
export type NewsPayload={items:NewsItem[];sources:SourceStatus[];checkedAt:string};
