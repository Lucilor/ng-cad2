import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CadPointsComponent } from './cad-points.component';

describe('CadPointsComponent', () => {
  let component: CadPointsComponent;
  let fixture: ComponentFixture<CadPointsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CadPointsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CadPointsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
