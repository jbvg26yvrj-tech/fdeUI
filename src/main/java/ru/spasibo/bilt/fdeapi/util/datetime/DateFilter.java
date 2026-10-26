package ru.spasibo.bilt.fdeapi.util.datetime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DateFilter {
    private DateTimeFilterValue eq;    // =
    private DateTimeFilterValue ne;    // !=
    private DateTimeFilterValue gt;    // >
    private DateTimeFilterValue lt;    // <
    private DateTimeFilterValue gte;   // >=
    private DateTimeFilterValue lte;   // <=
}