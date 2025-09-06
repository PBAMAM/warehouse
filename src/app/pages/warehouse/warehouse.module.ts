import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
 import { SharedModule } from '../../shared/shared.module';
import { WarehouseComponent } from './warehouse.component';

const routes = [
  { path: '', component: WarehouseComponent }
];

@NgModule({
  declarations: [
    WarehouseComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    SharedModule
  ]
})
export class WarehouseModule { }
