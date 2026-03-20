import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VerHistorial } from './ver-historial';

describe('VerHistorial', () => {
  let component: VerHistorial;
  let fixture: ComponentFixture<VerHistorial>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerHistorial]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VerHistorial);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
