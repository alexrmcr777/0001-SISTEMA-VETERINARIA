import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DuenosComponent } from './duenos-component';

describe('DuenosComponent', () => {
  let component: DuenosComponent;
  let fixture: ComponentFixture<DuenosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DuenosComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(DuenosComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});