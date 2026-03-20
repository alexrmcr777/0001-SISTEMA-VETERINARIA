import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearMascota } from './crear-mascota';

describe('CrearMascota', () => {
  let component: CrearMascota;
  let fixture: ComponentFixture<CrearMascota>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrearMascota]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrearMascota);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
