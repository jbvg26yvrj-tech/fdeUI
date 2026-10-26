package ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO ответа на массовую смену дата-центра.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkDatacenterResponse {

    private int updatedCount;
    private String datacenter;
}
