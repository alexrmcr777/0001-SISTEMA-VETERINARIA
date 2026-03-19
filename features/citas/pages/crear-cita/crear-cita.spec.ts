import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearCita } from './crear-cita';

describe('CrearCita', () => {
  let component: CrearCita;
  let fixture: ComponentFixture<CrearCita>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrearCita]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrearCita);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
