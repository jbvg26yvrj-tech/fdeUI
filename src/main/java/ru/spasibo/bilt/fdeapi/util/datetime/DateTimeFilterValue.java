package ru.spasibo.bilt.fdeapi.util.datetime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DateTimeFilterValue {
    private LocalDateTime value;
    private DateTimePrecision precision;
}