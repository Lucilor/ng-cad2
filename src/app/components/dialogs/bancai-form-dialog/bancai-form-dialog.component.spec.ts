import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BancaiFormDialogComponent } from './bancai-form-dialog.component';

describe('BancaiFormDialogComponent', () => {
  let component: BancaiFormDialogComponent;
  let fixture: ComponentFixture<BancaiFormDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BancaiFormDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BancaiFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
