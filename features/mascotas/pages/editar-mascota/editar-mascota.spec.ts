import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarMascota } from './editar-mascota';

describe('EditarMascota', () => {
  let component: EditarMascota;
  let fixture: ComponentFixture<EditarMascota>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditarMascota]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditarMascota);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
