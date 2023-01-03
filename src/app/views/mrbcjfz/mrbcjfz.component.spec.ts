import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MrbcjfzComponent } from './mrbcjfz.component';

describe('MrbcjfzComponent', () => {
  let component: MrbcjfzComponent;
  let fixture: ComponentFixture<MrbcjfzComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MrbcjfzComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MrbcjfzComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
