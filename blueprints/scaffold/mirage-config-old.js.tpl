
  var <%= dataBuilderFunctionName %> = function(obj) {
    return {
      type: '<%= jsonTypeName %>',
      id: obj.id,
      attributes: {
<%= attributeKeyValues %>
      },
    };
  };

  this.get('/<%= resourcePath %>', function(db) {
    return {
      data: db.<%= collectionName %>.map(<%= dataBuilderFunctionName %>),
    };
  });

  this.get('/<%= resourcePath %>/:<%= idParamName %>', function(db, request) {
    const item = db.<%= collectionName %>.find(request.params.<%= idParamName %>);
    return {
      data: <%= dataBuilderFunctionName %>(item),
    };
  });

  this.post('/<%= resourcePath %>', function(db, request) {
    const attrs = JSON.parse(request.requestBody).data.attributes_id;
    const item = db.<%= collectionName %>.insert(attrs);
    return {
      data: <%= dataBuilderFunctionName %>(item),
    };
  });

  this.del('/<%= resourcePath %>/:<%= idParamName %>', function(db, request) {
    db.<%= collectionName %>.remove(request.params.<%= idParamName %>);
    return new Mirage.Response(204, {}, null);
  });

  this.patch('/<%= resourcePath %>/:<%= idParamName %>', function(db, request) {
    const attrs = JSON.parse(request.requestBody).data.attributes;
    const item = db.<%= collectionName %>.update(request.params.<%= idParamName %>, attrs);
    return {
      data: <%= dataBuilderFunctionName %>(item),
    };
  });

