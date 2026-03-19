import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MascotasComponent } from './mascotas-component';

describe('MascotasComponent', () => {
  let component: MascotasComponent;
  let fixture: ComponentFixture<MascotasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MascotasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MascotasComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
