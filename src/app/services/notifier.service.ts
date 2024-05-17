import { Injectable } from '@angular/core';
import { ToastrService, IndividualConfig } from 'ngx-toastr';

interface ToastrOptions extends Partial<IndividualConfig<any>> {
  iconClass?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotifierService {
  constructor(private toastr: ToastrService) {}

  success(message: string) {
    this.toastr.info(message, null);
  }
}
