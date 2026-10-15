-- ISO 4217 List One: SIX Group, retrieved 2026-10-15. No exchange-rate conversion.
create table public.supported_currencies(code text primary key check(code ~ '^[A-Z]{3}$'), name text not null, minor_digits integer not null check(minor_digits between 0 and 4));
insert into public.supported_currencies values
('AED','UAE Dirham',2),
('AFN','Afghani',2),
('ALL','Lek',2),
('AMD','Armenian Dram',2),
('AOA','Kwanza',2),
('ARS','Argentine Peso',2),
('AUD','Australian Dollar',2),
('AWG','Aruban Florin',2),
('AZN','Azerbaijan Manat',2),
('BAM','Convertible Mark',2),
('BBD','Barbados Dollar',2),
('BDT','Taka',2),
('BHD','Bahraini Dinar',3),
('BIF','Burundi Franc',0),
('BMD','Bermudian Dollar',2),
('BND','Brunei Dollar',2),
('BOB','Boliviano',2),
('BOV','Mvdol',2),
('BRL','Brazilian Real',2),
('BSD','Bahamian Dollar',2),
('BTN','Ngultrum',2),
('BWP','Pula',2),
('BYN','Belarusian Ruble',2),
('BZD','Belize Dollar',2),
('CAD','Canadian Dollar',2),
('CDF','Congolese Franc',2),
('CHE','WIR Euro',2),
('CHF','Swiss Franc',2),
('CHW','WIR Franc',2),
('CLF','Unidad de Fomento',4),
('CLP','Chilean Peso',0),
('CNY','Yuan Renminbi',2),
('COP','Colombian Peso',2),
('COU','Unidad de Valor Real',2),
('CRC','Costa Rican Colon',2),
('CUP','Cuban Peso',2),
('CVE','Cabo Verde Escudo',2),
('CZK','Czech Koruna',2),
('DJF','Djibouti Franc',0),
('DKK','Danish Krone',2),
('DOP','Dominican Peso',2),
('DZD','Algerian Dinar',2),
('EGP','Egyptian Pound',2),
('ERN','Nakfa',2),
('ETB','Ethiopian Birr',2),
('EUR','Euro',2),
('FJD','Fiji Dollar',2),
('FKP','Falkland Islands Pound',2),
('GBP','Pound Sterling',2),
('GEL','Lari',2),
('GHS','Ghana Cedi',2),
('GIP','Gibraltar Pound',2),
('GMD','Dalasi',2),
('GNF','Guinean Franc',0),
('GTQ','Quetzal',2),
('GYD','Guyana Dollar',2),
('HKD','Hong Kong Dollar',2),
('HNL','Lempira',2),
('HTG','Gourde',2),
('HUF','Forint',2),
('IDR','Rupiah',2),
('ILS','New Israeli Sheqel',2),
('INR','Indian Rupee',2),
('IQD','Iraqi Dinar',3),
('IRR','Iranian Rial',2),
('ISK','Iceland Krona',0),
('JMD','Jamaican Dollar',2),
('JOD','Jordanian Dinar',3),
('JPY','Yen',0),
('KES','Kenyan Shilling',2),
('KGS','Som',2),
('KHR','Riel',2),
('KMF','Comorian Franc ',0),
('KPW','North Korean Won',2),
('KRW','Won',0),
('KWD','Kuwaiti Dinar',3),
('KYD','Cayman Islands Dollar',2),
('KZT','Tenge',2),
('LAK','Lao Kip',2),
('LBP','Lebanese Pound',2),
('LKR','Sri Lanka Rupee',2),
('LRD','Liberian Dollar',2),
('LSL','Loti',2),
('LYD','Libyan Dinar',3),
('MAD','Moroccan Dirham',2),
('MDL','Moldovan Leu',2),
('MGA','Malagasy Ariary',2),
('MKD','Denar',2),
('MMK','Kyat',2),
('MNT','Tugrik',2),
('MOP','Pataca',2),
('MRU','Ouguiya',2),
('MUR','Mauritius Rupee',2),
('MVR','Rufiyaa',2),
('MWK','Malawi Kwacha',2),
('MXN','Mexican Peso',2),
('MXV','Mexican Unidad de Inversion (UDI)',2),
('MYR','Malaysian Ringgit',2),
('MZN','Mozambique Metical',2),
('NAD','Namibia Dollar',2),
('NGN','Naira',2),
('NIO','Cordoba Oro',2),
('NOK','Norwegian Krone',2),
('NPR','Nepalese Rupee',2),
('NZD','New Zealand Dollar',2),
('OMR','Rial Omani',3),
('PAB','Balboa',2),
('PEN','Sol',2),
('PGK','Kina',2),
('PHP','Philippine Peso',2),
('PKR','Pakistan Rupee',2),
('PLN','Zloty',2),
('PYG','Guarani',0),
('QAR','Qatari Rial',2),
('RON','Romanian Leu',2),
('RSD','Serbian Dinar',2),
('RUB','Russian Ruble',2),
('RWF','Rwanda Franc',0),
('SAR','Saudi Riyal',2),
('SBD','Solomon Islands Dollar',2),
('SCR','Seychelles Rupee',2),
('SDG','Sudanese Pound',2),
('SEK','Swedish Krona',2),
('SGD','Singapore Dollar',2),
('SHP','Saint Helena Pound',2),
('SLE','Leone',2),
('SOS','Somali Shilling',2),
('SRD','Surinam Dollar',2),
('SSP','South Sudanese Pound',2),
('STN','Dobra',2),
('SVC','El Salvador Colon',2),
('SYP','Syrian Pound',2),
('SZL','Lilangeni',2),
('THB','Baht',2),
('TJS','Somoni',2),
('TMT','Turkmenistan New Manat',2),
('TND','Tunisian Dinar',3),
('TOP','Pa’anga',2),
('TRY','Turkish Lira',2),
('TTD','Trinidad and Tobago Dollar',2),
('TWD','New Taiwan Dollar',2),
('TZS','Tanzanian Shilling',2),
('UAH','Hryvnia',2),
('UGX','Uganda Shilling',0),
('USD','US Dollar',2),
('USN','US Dollar (Next day)',2),
('UYI','Uruguay Peso en Unidades Indexadas (UI)',0),
('UYU','Peso Uruguayo',2),
('UYW','Unidad Previsional',4),
('UZS','Uzbekistan Sum',2),
('VED','Bolívar Soberano',2),
('VES','Bolívar Soberano',2),
('VND','Dong',0),
('VUV','Vatu',0),
('WST','Tala',2),
('XAD','Arab Accounting Dinar',2),
('XAF','CFA Franc BEAC',0),
('XCD','East Caribbean Dollar',2),
('XCG','Caribbean Guilder',2),
('XOF','CFA Franc BCEAO',0),
('XPF','CFP Franc',0),
('YER','Yemeni Rial',2),
('ZAR','Rand',2),
('ZMW','Zambian Kwacha',2),
('ZWG','Zimbabwe Gold',2);
alter table public.supported_currencies enable row level security;
revoke all on public.supported_currencies from anon,authenticated;
grant select on public.supported_currencies to authenticated;
create policy currencies_read on public.supported_currencies for select to authenticated using(true);
alter table public.households drop constraint households_currency_check;
alter table public.expenses drop constraint expenses_currency_check;
alter table public.households add constraint households_currency_catalog foreign key(currency) references public.supported_currencies(code);
alter table public.expenses add constraint expenses_currency_catalog foreign key(currency) references public.supported_currencies(code);

create function roomie_private.preserve_household_currency() returns trigger language plpgsql set search_path='' as $$
begin
 if new.currency<>old.currency then raise exception 'Household currency is fixed after creation' using errcode='22023'; end if;
 return new;
end; $$;
create trigger household_currency_fixed before update of currency on public.households for each row execute function roomie_private.preserve_household_currency();
create function roomie_private.expense_household_currency() returns trigger language plpgsql security definer set search_path='' as $$
declare v_currency text;
begin
 select currency into v_currency from public.households where id=new.household_id;
 if tg_op='INSERT' then new.currency:=v_currency;
 elsif new.currency is distinct from v_currency or new.household_id<>old.household_id then raise exception 'Expense currency must match its household' using errcode='22023'; end if;
 return new;
end; $$;
create trigger expense_currency_matches before insert or update on public.expenses for each row execute function roomie_private.expense_household_currency();
revoke all on function roomie_private.preserve_household_currency(),roomie_private.expense_household_currency() from public,anon,authenticated;
drop function public.roomie_create_household(text);
create function public.roomie_create_household(p_name text,p_currency text default 'MYR') returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_id uuid;
begin
 if v_user is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if p_name is null or char_length(btrim(p_name)) not between 1 and 80 then raise exception 'Invalid household name' using errcode='22023'; end if;
 if p_currency is null or not exists(select 1 from public.supported_currencies where code=p_currency) then raise exception 'Unsupported household currency' using errcode='22023'; end if;
 insert into public.households(name,currency,created_by) values(btrim(p_name),p_currency,v_user) returning id into v_id;
 insert into public.household_members(household_id,user_id,role) values(v_id,v_user,'owner');
 return v_id;
end; $$;
revoke all on function public.roomie_create_household(text,text) from public,anon;
grant execute on function public.roomie_create_household(text,text) to authenticated;
