alter table restaurants add column theme text not null default 'brasa'
  check (theme in ('brasa', 'mar', 'cafe', 'huerta'));
