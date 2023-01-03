import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BancaiFormComponent } from './bancai-form.component';

describe('BancaiFormComponent', () => {
  let component: BancaiFormComponent;
  let fixture: ComponentFixture<BancaiFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BancaiFormComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BancaiFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
