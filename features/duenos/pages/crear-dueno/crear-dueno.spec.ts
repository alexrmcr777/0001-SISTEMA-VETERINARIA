import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearDueno } from './crear-dueno';

describe('CrearDueno', () => {
  let component: CrearDueno;
  let fixture: ComponentFixture<CrearDueno>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrearDueno]
    })
      .compileComponents();

    fixture = TestBed.createComponent(CrearDueno);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});