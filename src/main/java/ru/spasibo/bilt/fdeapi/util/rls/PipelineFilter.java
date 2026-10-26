package ru.spasibo.bilt.fdeapi.util.rls;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.spasibo.bilt.fdeapi.util.datetime.DateFilter;
import ru.spasibo.bilt.fdeapi.util.datetime.DateFilterSerializer;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PipelineFilter implements Filter {

    private UUID id;
    private String pipelineName;
    private String pipelineOwner;

    @JsonSerialize(using = DateFilterSerializer.class)
    private DateFilter createdAt;

    @JsonSerialize(using = DateFilterSerializer.class)
    private DateFilter updatedAt;

    private String active;
}