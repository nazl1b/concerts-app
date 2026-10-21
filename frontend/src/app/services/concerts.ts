import { httpResource } from '@angular/common/http';
import { Service } from '@angular/core';
import { ConcertPage, ConcertQuery } from '../models/concert';

export const CONCERTS_URL = 'http://127.0.0.1:5678/webhook/concerts';
export const PAGE_SIZE = 20;

@Service()
export class Concerts {
  // Fetches one page of concerts that match the query.
  // httpResource does the GET automatically, and again whenever query() changes. It gives us signals:
  //   page.value()     -> the page (undefined until it arrives)
  //   page.isLoading() -> true while waiting for the response
  //   page.error()     -> the error, if something went wrong
  //   page.reload()    -> fetches the same page again
  page(query: () => ConcertQuery) {
    return httpResource<ConcertPage>(() => ({
      url: CONCERTS_URL,
      params: { ...query(), limit: PAGE_SIZE },
    }));
  }
}
