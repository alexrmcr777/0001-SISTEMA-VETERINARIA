import { TestBed } from '@angular/core/testing';

import { Mascotas } from './mascotas';

describe('Mascotas', () => {
  let service: Mascotas;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Mascotas);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
