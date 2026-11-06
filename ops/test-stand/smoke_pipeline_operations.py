"""Check additive pipeline operations against a deployed stand, without launching flows.
Creates one disposable pipeline; never changes existing schedules or client data.
"""
import json
import sys
import time
from pathlib import Path
from smoke_access import Client


def main():
    base, credentials = sys.argv[1:]
    client = Client(base)
    client.login(json.loads(Path(credentials).read_text()))
    page = client.call('GET', '/pipelines?size=200')
    assert page['size'] == 200, page['size']
    if page['content']:
        ids = [row['id'] for row in page['content'][:100]]
        summaries = client.call('GET', '/analytics/pipeline-summaries?ids=' + ','.join(ids))
        assert {s['id'] for s in summaries} == set(ids)
        assert all(s['consecutiveFailures'] >= 0 and s['today']['sentBytes'] >= 0 for s in summaries)
        attention = client.call('GET', '/pipelines?needsAttention=true&size=200')
        attention_ids = {p['id'] for p in attention['content']}
        if page['totalElements'] <= 100:
            assert attention_ids == {s['id'] for s in summaries if s['consecutiveFailures'] >= 2}
        for p in attention['content']:
            assert client.call('GET', '/analytics/pipeline-summaries?ids=' + p['id'])[0]['consecutiveFailures'] >= 2
    pipeline_id = None
    try:
        pipeline = client.call('POST', '/pipelines', {
            'pipelineName': 'QA operations disposable ' + str(int(time.time())),
            'clientFrom': 'QA_OPERATIONS', 'clientTo': 'QA_OPERATIONS',
            'primaryDatacenter': 'SP', 'allOrNothing': False,
            'agreedVolumeBytes': 1250000000, 'agreedVolumePeriod': 'DAY',
            'tasks': [{'taskOrder': 1, 'typeCode': 'SftpDownloadTask',
                       'props': {'sourceDir': '/qa-not-executed', 'fileMask': '*', 'maskType': 'GLOB', 'recursive': 'false'}}],
        })
        pipeline_id = pipeline['id']
        assert pipeline['agreedVolumeBytes'] == 1250000000
        for period in ('DAY', 'MONTH', 'RUN'):
            client.call('PUT', '/pipelines/' + pipeline_id, {'agreedVolumePeriod': period})
            summary = client.call('GET', '/analytics/pipeline-summaries?ids=' + pipeline_id)[0]
            assert summary['agreedVolumePeriod'] == period
            assert summary['agreedVolumeBytes'] == 1250000000
            assert summary['periodSentBytes'] == 0
            assert summary['today']['sessions'] == 0
        cleared = client.call('PUT', '/pipelines/' + pipeline_id, {'agreedVolumeBytes': 0})
        assert cleared['agreedVolumeBytes'] is None
        client.call('PUT', '/pipelines/' + pipeline_id, {'agreedVolumeBytes': -1}, expected=(400,))
        client.call('GET', '/sessions?pipelineId=' + pipeline_id)
        client.call('PATCH', '/pipelines/datacenter', {'datacenter': 'SC', 'pipelineIds': []}, expected=(400,))
        print('PASS pipeline operations: page200, PostgreSQL summaries, agreements DAY/MONTH/RUN, clear, validation; no launches')
    finally:
        if pipeline_id:
            client.call('DELETE', '/pipelines/' + pipeline_id)


if __name__ == '__main__':
    main()
