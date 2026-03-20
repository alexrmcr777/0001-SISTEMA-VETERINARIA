import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarDueno } from './editar-dueno';

describe('EditarDueno', () => {
  let component: EditarDueno;
  let fixture: ComponentFixture<EditarDueno>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditarDueno]
    })
      .compileComponents();

    fixture = TestBed.createComponent(EditarDueno);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});