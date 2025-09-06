import { Directive, EventEmitter, HostListener, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Directive({
  selector: '[appDebounce]'
})
export class DebounceDirective implements OnInit, OnDestroy {
  @Input() debounceTime: number = 300;
  @Output() debouncedEvent = new EventEmitter<Event>();

  private subject = new Subject<Event>();

  ngOnInit() {
    this.subject
      .pipe(
        debounceTime(this.debounceTime),
        distinctUntilChanged()
      )
      .subscribe(event => {
        this.debouncedEvent.emit(event);
      });
  }

  @HostListener('input', ['$event'])
  onInput(event: Event) {
    this.subject.next(event);
  }

  ngOnDestroy() {
    this.subject.complete();
  }
}
