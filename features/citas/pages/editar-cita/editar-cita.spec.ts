import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarCita } from './editar-cita';

describe('EditarCita', () => {
  let component: EditarCita;
  let fixture: ComponentFixture<EditarCita>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditarCita]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditarCita);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
